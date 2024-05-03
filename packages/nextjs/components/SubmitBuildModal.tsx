import { useEffect, useState } from "react";
import { ListEntry } from "./Game";
import { VoxelCoord } from "@latticexyz/utils";
import { formatEther, parseGwei } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { BigCopy } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo, useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

type CreateBuildModalProps = {
  closeModal: () => void;
  build: ListEntry;
};

export enum SubmitBuildModalStep {
  ShowExtensionsToggle,
  ImportBuild,
  OpenBuildView,
  PlaceOutlineView,
  CopyBuild,
  SubmitBuild,
}

export const SubmitBuildModal: React.FC<CreateBuildModalProps> = ({ closeModal, build }) => {
  const { address: connectedAddress } = useAccount();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");
  const writeTxn = useTransactor();
  const [textInput, setTextInput] = useState("");
  const [step, setStep] = useState(SubmitBuildModalStep.ShowExtensionsToggle);
  const [baseWorldCoord, setBaseWorldCoord] = useState<VoxelCoord | undefined>(undefined);
  const { chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [invalidJson, setInvalidJson] = useState(false);
  const { targetNetwork } = useTargetNetwork();
  const writeDisabled = !chain || chain?.id !== targetNetwork.id;
  const [isLoading, setIsLoading] = useState(false);

  const handleTextInputChange = event => {
    setTextInput(event.target.value);
  };

  useEffect(() => {
    if (textInput.length === 0) {
      setInvalidJson(true);
      return;
    }
    try {
      const parsedJson = JSON.parse(textInput);
      // validate JSON
      if (!parsedJson.baseWorldCoord) {
        throw new Error("Invalid JSON");
      }
      setBaseWorldCoord(parsedJson.baseWorldCoord);
      setInvalidJson(false);
    } catch (e) {
      setInvalidJson(true);
    }
  }, [textInput]);

  // const [displayedTxResult, setDisplayedTxResult] = useState<TransactionReceipt>();
  // const { data: txResult } = useWaitForTransaction({
  //   hash: result?.hash,
  // });
  // useEffect(() => {
  //   setDisplayedTxResult(txResult);
  // }, [txResult]);

  const resetState = () => {
    // reset state
    setStep(SubmitBuildModalStep.ShowExtensionsToggle);
    setTextInput("");
    setBaseWorldCoord(undefined);
    setInvalidJson(false);
  };

  const handleWrite = async () => {
    if (deployedContractData === undefined) {
      return;
    }
    try {
      closeModal();
      resetState();
      setIsLoading(true);
      const makeWriteWithParams = () =>
        writeContractAsync({
          address: deployedContractData?.address,
          functionName: "submitBuilding",
          maxFeePerGas: parseGwei("0.01"),
          maxPriorityFeePerGas: parseGwei("0.001"),
          abi: deployedContractData?.abi,
          args: [build.id, baseWorldCoord ?? { x: 0, y: 0, z: 0 }],
          value: build.price,
        });
      await writeTxn(makeWriteWithParams);
      setIsLoading(false);
    } catch (e: any) {
      console.error("⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error", e);
    }
  };

  if (connectedAddress === undefined) {
    return <div>Connect your wallet to continue</div>;
  }

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const renderStep = () => {
    switch (step) {
      case SubmitBuildModalStep.ShowExtensionsToggle:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              1. Toggle To &quot;Show&quot; in Biomes Client
            </h2>
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/enable_extensions.png" className="border w-full rounded-sm" />
            </div>
            <button
              className="w-full btn btn-primary bg-secondary rounded-sm"
              onClick={() => {
                setStep(SubmitBuildModalStep.ImportBuild);
              }}
            >
              I Have Toggled To &quot;Show&quot;
            </button>
          </div>
        );
      case SubmitBuildModalStep.ImportBuild:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              2. Copy Build JSON, Paste Into Biomes Client, and Import
            </h2>
            <BigCopy result={build.blueprint} />
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/import_blueprint.png" className="w-full border rounded-sm" />
            </div>
            <button
              className="w-full btn btn-primary bg-secondary rounded-sm"
              onClick={() => {
                setStep(SubmitBuildModalStep.OpenBuildView);
              }}
            >
              I Have Imported The Build
            </button>
          </div>
        );
      case SubmitBuildModalStep.OpenBuildView:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              3. Click On The Build&apos;s Preview Card
            </h2>
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/open_build.png" className="w-full border rounded-sm" />
            </div>
            <button
              className="w-full btn btn-primary bg-secondary rounded-sm"
              onClick={() => {
                setStep(SubmitBuildModalStep.PlaceOutlineView);
              }}
            >
              I Have Opened The Build Preview
            </button>
          </div>
        );
      case SubmitBuildModalStep.PlaceOutlineView:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              4. Place Outline Then Fill In With Correct Blocks
            </h2>
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/view_outline.png" className="w-full border rounded-sm" />
            </div>
            <button
              className="w-full btn btn-primary bg-secondary rounded-sm"
              onClick={() => {
                setStep(SubmitBuildModalStep.CopyBuild);
              }}
            >
              I Have Filled In The Outline
            </button>
          </div>
        );
      case SubmitBuildModalStep.CopyBuild:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              5. After Filling in Outline, Click Copy In The Build Preview Card
            </h2>
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/blocks_build_preview.png" className="w-full border rounded-sm" />
            </div>
            <button
              className="w-full btn btn-primary bg-secondary rounded-sm"
              onClick={() => {
                setStep(SubmitBuildModalStep.SubmitBuild);
              }}
            >
              I Have Copied Build Position in World
            </button>
          </div>
        );
      case SubmitBuildModalStep.SubmitBuild:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              6. Paste World Position and Pay Submission Fee
            </h2>
            <label>{build.name}</label>
            <label>{formatEther(build.price) + " Ξ"}</label>
            <textarea
              value={textInput}
              onChange={handleTextInputChange}
              style={{ padding: "8px", background: "white", color: "black", width: "100%" }}
              placeholder="Paste Build JSON From Biomes"
              rows={4}
              disabled={isLoading}
              cols={20}
            />
            <div className="flex justify-end gap-2">
              <div
                className={`flex ${
                  (writeDisabled || invalidJson || baseWorldCoord === undefined) &&
                  "tooltip tooltip-secondary before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
                }`}
                data-tip={`${
                  (writeDisabled && "Wallet not connected or in the wrong network") ||
                  (invalidJson && "Invalid build JSON pasted") ||
                  (baseWorldCoord === undefined && "World coordinate required")
                }`}
              >
                {/* <div className="flex-grow basis-0">
                  {displayedTxResult ? <TxReceipt txResult={displayedTxResult} /> : null}
                </div> */}
                <button
                  className="btn btn-secondary btn-sm rounded-sm"
                  disabled={writeDisabled || isLoading || invalidJson || baseWorldCoord === undefined}
                  onClick={handleWrite}
                >
                  {isLoading && <span className="loading loading-spinner loading-xs"></span>}
                  Submit Build
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{ zIndex: "9000" }}
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      onClick={() => closeModal()}
    >
      <div className="bg-black p-4 border w-3/5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold text-left mt-4 mb-5">Submit Build {(step + 1).toString()}/6</h1>
          <label className="btn btn-ghost btn-sm btn-circle relative right-3 top-3" onClick={() => closeModal()}>
            ✕
          </label>
        </div>
        {renderStep()}
      </div>
    </div>
  );
};
