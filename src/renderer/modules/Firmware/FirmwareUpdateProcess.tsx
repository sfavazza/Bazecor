// -*- mode: js-jsx -*-
/* Bazecor
 * Copyright (C) 2022  Dygmalab, Inc.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useState, useEffect } from "react";
import Styled from "styled-components";
import log from "electron-log/renderer";
import { useMachine } from "@xstate/react";
import { i18n } from "@Renderer/i18n";
import { useDevice } from "@Renderer/DeviceContext";

// State machine
import FlashDevice from "@Renderer/controller/FlashingProcedure/machine";

// Visual components
import Title from "@Renderer/component/Title";
import { RegularButton } from "@Renderer/component/Button";
import { FirmwareLoader } from "@Renderer/component/Loader";

// types
import { ContextType } from "@Renderer/controller/FlashManager/context";
import { DygmaDeviceType } from "@Renderer/types/dygmaDefs";
import { BackupType } from "@Renderer/types/backups";

// Visual modules
import FirmwareProgressStatus from "./FirmwareProgressStatus";

const Style = Styled.div`
width: 100%;
height: inherit;
.firmware-wrapper {
  max-width: 680px;
  width: 100%;
  margin: auto;
  .firmware-row {
    width: 100%;
    display: flex;
    flex-wrap: nowrap;
  }
  .firmware-content {
    flex: 0 0 66%;
    background: ${({ theme }) => theme.styles.firmwareUpdatePanel.backgroundContent};
  }
  .firmware-sidebar {
    flex: 0 0 34%;
    background: ${({ theme }) => theme.styles.firmwareUpdatePanel.backgroundSidebar};
  }
  .firmware-content--inner {
    padding: 32px;
  }
  .borderLeftTopRadius {
    border-top-left-radius: 14px;
  }
  .borderRightTopRadius {
    border-top-right-radius: 14px;
  }
  .borderLeftBottomRadius {
    border-bottom-left-radius: 14px;
  }
  .borderRightBottomRadius {
    border-bottom-right-radius: 14px;
  }
}
.firmware-footer {
  width: 100%;
  margin-top: 62px;
}
.holdButton {
  margin-bottom: 32px;
  display: flex;
  grid-gap: 8px;
}
.holdTootip {
  h6 {
    font-size: 13px;
    font-weight: 395;
    letter-spacing: 0;
    color:  ${({ theme }) => theme.colors.gray300};
  }
}
.progress-visualizer {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
`;

interface FirmwareUpdateProcessProps {
  nextBlock: (context: any) => void;
  retryBlock: (context: any) => void;
  context: ContextType;
  toggleFlashing: () => void;
  toggleFwUpdate: (value: boolean) => void;
  onDisconnect: () => void;
  setRestoredOk: (value: boolean) => void;
}

function FirmwareUpdateProcess(props: FirmwareUpdateProcessProps) {
  const { nextBlock, retryBlock, context, toggleFlashing, toggleFwUpdate, onDisconnect, setRestoredOk } = props;
  const { state: deviceState } = useDevice();
  const [toggledFlashing, sendToggledFlashing] = useState(false);

  // keypress handler to handle keyboard actions.
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case 27:
        log.info("esc key logged");
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        send({ type: "escpressed-event" });
        break;
      default:
        break;
    }
  };

  interface INCtype {
    type: string;
    data: {
      globalProgress: number;
      leftProgress: number;
      rightProgress: number;
      resetProgress: number;
      neuronProgress: number;
      restoreProgress: number;
    };
  }

  const stateUpdate = (data: INCtype) => {
    send({
      type: "increment-event",
      globalProgress: data.data.globalProgress,
      leftProgress: data.data.leftProgress,
      rightProgress: data.data.rightProgress,
      resetProgress: data.data.resetProgress,
      neuronProgress: data.data.neuronProgress,
      restoreProgress: data.data.restoreProgress,
    });
  };

  const [state, send] = useMachine(
    FlashDevice.provide({
      actions: {
        addEscListener: () => {
          log.info("added event listener");
          document.addEventListener("keydown", handleKeyDown);
        },
        removeEscListener: () => {
          log.info("removed event listener");
          document.removeEventListener("keydown", handleKeyDown);
        },
        toggleFlashing: async () => {
          if (toggledFlashing) return;
          log.info("starting flashing indicators");
          toggleFlashing();
          toggleFwUpdate(true);
          sendToggledFlashing(true);
        },
        finishFlashing: async () => {
          if (!toggledFlashing) return;
          setRestoredOk(state.context.restoreResult as boolean);
          sendToggledFlashing(false);
          log.info("closing flashin process");
          toggleFlashing();
          toggleFwUpdate(false);
          onDisconnect();
        },
      },
    }),
    {
      input: {
        deviceState,
        device: deviceState.currentDevice.device as DygmaDeviceType,
        backup: context.backup as BackupType,
        firmwares: context.firmwares,
        isUpdated: context.isUpdated as boolean,
        RaiseBrightness: context.RaiseBrightness as string,
        sideLeftOk: context.sideLeftOk,
        sideLeftBL: context.sideLeftBL,
        sideRightOK: context.sideRightOK,
        sideRightBL: context.sideRightBL,
        stateUpdate,
      },
    },
  );

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (state.context.stateblock > 0) {
      setLoading(false);
    }
    if (state.value === "success") nextBlock(state.context);
  }, [nextBlock, state]);

  const stepsDefy = [
    { step: 1, title: i18n.firmwareUpdate.texts.flashCardTitle1, description: i18n.firmwareUpdate.texts.flashCardTitle2 },
    {
      step: 2,
      title: i18n.firmwareUpdate.texts.progressCardStatusDefy1,
      description: i18n.firmwareUpdate.texts.progressCardBarDefy1,
    },
    {
      step: 3,
      title: i18n.firmwareUpdate.texts.progressCardStatusDefy2,
      description: i18n.firmwareUpdate.texts.progressCardBarDefy2,
    },
    {
      step: 4,
      title: i18n.firmwareUpdate.texts.progressCardStatusDefy3,
      description: i18n.firmwareUpdate.texts.progressCardBarDefy3,
    },
    {
      step: 5,
      title: i18n.firmwareUpdate.texts.progressCardStatusDefy4,
      description: i18n.firmwareUpdate.texts.progressCardBarDefy4,
    },
    {
      step: 6,
      title: i18n.firmwareUpdate.texts.progressCardStatusDefy5,
      description: i18n.firmwareUpdate.texts.progressCardBarDefy5,
    },
    {
      step: 7,
      title: i18n.firmwareUpdate.texts.progressCardStatusDefy6,
      description: i18n.firmwareUpdate.texts.progressCardBarSuccess,
    },
    {
      step: 8,
      title: i18n.firmwareUpdate.texts.errorDuringProcessTitle,
      description: i18n.firmwareUpdate.texts.errorDuringProcessDescription,
    },
  ];
  const stepsRaise = [
    { step: 1, title: i18n.firmwareUpdate.texts.flashCardTitle1, description: i18n.firmwareUpdate.texts.flashCardTitle2 },
    { step: 4, title: i18n.firmwareUpdate.texts.progressCardStatus1, description: i18n.firmwareUpdate.texts.progressCardBar1 },
    { step: 5, title: i18n.firmwareUpdate.texts.progressCardStatus2, description: i18n.firmwareUpdate.texts.progressCardBar2 },
    { step: 6, title: i18n.firmwareUpdate.texts.progressCardStatus3, description: i18n.firmwareUpdate.texts.progressCardBar3 },
    {
      step: 7,
      title: i18n.firmwareUpdate.texts.progressCardStatus4,
      description: i18n.firmwareUpdate.texts.progressCardBarSuccess,
    },
    {
      step: 8,
      title: i18n.firmwareUpdate.texts.errorDuringProcessTitle,
      description: i18n.firmwareUpdate.texts.errorDuringProcessDescription,
    },
  ];

  return (
    <Style>
      {loading ? (
        <FirmwareLoader width={undefined} warning={undefined} error={undefined} paused={undefined} />
      ) : (
        <div className="firmware-wrapper upgrade-firmware">
          <div className="firmware-row progress-visualizer">
            <FirmwareProgressStatus
              flashProgress={state.context.globalProgress}
              leftProgress={state.context.leftProgress}
              retriesLeft={state.context.retriesLeft}
              rightProgress={state.context.rightProgress}
              retriesRight={state.context.retriesRight}
              resetProgress={state.context.resetProgress}
              neuronProgress={state.context.neuronProgress}
              retriesNeuron={state.context.retriesNeuron}
              retriesDefyWired={state.context.retriesDefyWired}
              restoreProgress={state.context.restoreProgress}
              countdown={state.context.stateblock}
              deviceProduct={state.context.device?.info.product}
              keyboardType={state.context.device?.info.keyboardType}
              steps={state.context.device?.info.product === "Defy" ? stepsDefy : stepsRaise}
            />
          </div>
          {state.context.stateblock === 1 ? (
            <div className="firmware-footer">
              <div className="holdButton">
                <RegularButton
                  styles="flashingbutton nooutlined outline transp-bg"
                  size="sm"
                  buttonText={i18n.firmwareUpdate.texts.cancelButton}
                  onClick={() => {
                    retryBlock(state.context);
                  }}
                />
              </div>
              <div className="holdTootip">
                <Title
                  text={
                    state.context.device?.info.product === "Raise"
                      ? i18n.firmwareUpdate.texts.flashCardHelp
                      : i18n.firmwareUpdate.texts.flashCardHelpDefy
                  }
                  headingLevel={6}
                  tooltip={
                    state.context.device?.info.product === "Raise"
                      ? i18n.firmwareUpdate.texts.flashCardHelpTooltip
                      : i18n.firmwareUpdate.texts.flashCardHelpTooltipDefy
                  }
                  tooltipSize="wide"
                />
              </div>
            </div>
          ) : (
            ""
          )}
          {state.context.stateblock === 8 ? (
            <div className="firmware-footer">
              <div className="holdButton">
                <RegularButton
                  styles="flashingbutton nooutlined outline transp-bg"
                  size="sm"
                  buttonText={i18n.firmwareUpdate.texts.cancelButton}
                  onClick={() => {
                    send({ type: "cancel-event" });
                    retryBlock(state.context);
                  }}
                />
                <RegularButton
                  styles="flashingbutton nooutlined primary"
                  size="sm"
                  buttonText="Retry the flashing procedure"
                  onClick={() => {
                    send({ type: "retry-event" });
                  }}
                />
              </div>
              <div className="holdTootip">
                <Title
                  text={
                    state.context.device?.info.product === "Raise"
                      ? i18n.firmwareUpdate.texts.flashCardHelp
                      : i18n.firmwareUpdate.texts.flashCardHelpDefy
                  }
                  headingLevel={6}
                  tooltip={
                    state.context.device?.info.product === "Raise"
                      ? i18n.firmwareUpdate.texts.flashCardHelpTooltip
                      : i18n.firmwareUpdate.texts.flashCardHelpTooltipDefy
                  }
                  tooltipSize="wide"
                />
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
      )}
    </Style>
  );
}

export default FirmwareUpdateProcess;
