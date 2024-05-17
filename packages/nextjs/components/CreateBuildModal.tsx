import { useEffect, useState } from "react";
import { EtherInput, InputBase } from "./scaffold-eth";
import { VoxelCoord } from "@latticexyz/utils";
import { parseEther } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useDeployedContractInfo, useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

type CreateBuildModalProps = {
  closeModal: () => void;
};

export enum CreateBuildModalStep {
  ShowExtensionsToggle,
  EnterBuildMode,
  SelectBlocks,
  SaveBuild,
  SubmitBuild,
}

export const CreateBuildModal: React.FC<CreateBuildModalProps> = ({ closeModal }) => {
  const { address: connectedAddress } = useAccount();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");
  const [buildName, setBuildName] = useState("");
  const [buildPrice, setBuildPrice] = useState("");
  const [submitBuildPrice, setSubmitBuildPrice] = useState(0n);
  const writeTxn = useTransactor();
  const [textInput, setTextInput] = useState("");
  const [step, setStep] = useState(CreateBuildModalStep.ShowExtensionsToggle);
  const [objectTypeIds, setObjectTypeIds] = useState<number[]>([]);
  const { chain } = useAccount();
  const [relativePositions, setRelativePositions] = useState<VoxelCoord[]>([]);
  const [invalidJson, setInvalidJson] = useState(false);
  const { writeContractAsync } = useWriteContract();
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
      if (!parsedJson.objectTypeIds || !parsedJson.relativePositions) {
        throw new Error("Invalid JSON");
      }
      setObjectTypeIds(parsedJson.objectTypeIds);
      setRelativePositions(parsedJson.relativePositions);
      setInvalidJson(false);
    } catch (e) {
      setInvalidJson(true);
    }
  }, [textInput]);

  useEffect(() => {
    try {
      if (buildPrice.length === 0) {
        setSubmitBuildPrice(0n);
      }
      const weiValue = parseEther(buildPrice);
      setSubmitBuildPrice(weiValue);
    } catch (e) {
      setSubmitBuildPrice(0n);
    }
  }, [buildPrice]);

  // const [displayedTxResult, setDisplayedTxResult] = useState<TransactionReceipt>();
  // const { data: txResult } = useWaitForTransaction({
  //   hash: result?.hash,
  // });
  // useEffect(() => {
  //   setDisplayedTxResult(txResult);
  // }, [txResult]);

  const resetState = () => {
    // reset state
    setStep(CreateBuildModalStep.ShowExtensionsToggle);
    setBuildName("");
    setBuildPrice("");
    setSubmitBuildPrice(0n);
    setTextInput("");
    setObjectTypeIds([]);
    setRelativePositions([]);
    setInvalidJson(false);
  };

  const handleWrite = async () => {
    try {
      if (deployedContractData === undefined) {
        return;
      }
      closeModal();
      resetState();
      setIsLoading(true);
      const makeWriteWithParams = () =>
        writeContractAsync({
          address: deployedContractData.address,
          functionName: "create",
          abi: deployedContractData?.abi,
          args: [objectTypeIds, relativePositions, submitBuildPrice, buildName],
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
      case CreateBuildModalStep.ShowExtensionsToggle:
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
                setStep(CreateBuildModalStep.EnterBuildMode);
              }}
            >
              I Have Toggled To &quot;Show&quot;
            </button>
          </div>
        );
      case CreateBuildModalStep.EnterBuildMode:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              2. Click &quot;Create&quot; in Builds Section
            </h2>
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/build_create.png" className="border w-full rounded-sm" />
            </div>
            <button
              className="w-full btn btn-primary bg-secondary rounded-sm"
              onClick={() => {
                setStep(CreateBuildModalStep.SelectBlocks);
              }}
            >
              I Have Entered Create Mode
            </button>
          </div>
        );
      case CreateBuildModalStep.SelectBlocks:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              3. Select blocks to use and create a build! This build is offchain.
            </h2>
            <div className="pt-2 flex flex-col" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/build_mode_select.png" className="border w-full rounded-sm" />
            </div>
            <button
              className="w-full btn btn-primary bg-secondary rounded-sm"
              onClick={() => {
                setStep(CreateBuildModalStep.SaveBuild);
              }}
            >
              I Have Created a Build
            </button>
          </div>
        );
      case CreateBuildModalStep.SaveBuild:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              4. Save Your Build, Give it a Name, and Copy the JSON
            </h2>
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/build_mode_save.png" className="border w-2/3 rounded-sm" />
              <img alt="" src="/build_mode_copy.png" className="border w-full rounded-sm" />

              {/*
              <Image alt="" src="/build_mode_save.png" width={100} height={250} className="border rounded-sm h-fit" />
              <Image alt="" src="/build_mode_copy.png" width={400} height={500} className="border rounded-sm" /> */}
            </div>
            <button
              className="w-full btn btn-primary bg-secondary rounded-sm"
              onClick={() => {
                setStep(CreateBuildModalStep.SubmitBuild);
              }}
            >
              I Have Copied My Build JSON
            </button>
          </div>
        );
      case CreateBuildModalStep.SubmitBuild:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              5. Enter Name, Paste Build JSON, and Set Submission Price
            </h2>
            <InputBase
              name={"buildName"}
              value={buildName}
              onChange={newValue => setBuildName(newValue)}
              placeholder={"Build Name"}
              error={undefined}
              disabled={isLoading}
            />
            <textarea
              value={textInput}
              onChange={handleTextInputChange}
              style={{ padding: "8px", background: "white", color: "black", width: "100%" }}
              placeholder="Paste Build JSON From Biomes"
              rows={4}
              disabled={isLoading}
              cols={20}
            />
            <EtherInput
              placeholder="Submission Price (ETH)"
              value={buildPrice}
              disabled={isLoading}
              onChange={value => setBuildPrice(value)}
            />
            <div className="flex justify-end gap-2">
              <div
                className={`flex ${
                  (writeDisabled || invalidJson || objectTypeIds.length === 0 || submitBuildPrice === 0n) &&
                  "tooltip tooltip-secondary before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
                }`}
                data-tip={`${
                  (writeDisabled && "Wallet not connected or in the wrong network") ||
                  (invalidJson && "Invalid build JSON pasted") ||
                  (buildName.length === 0 && "Build name required") ||
                  (objectTypeIds.length === 0 && "No blocks selected") ||
                  (submitBuildPrice === 0n && "Submission price cannot be 0")
                }`}
              >
                {/* <div className="flex-grow basis-0">
                  {displayedTxResult ? <TxReceipt txResult={displayedTxResult} /> : null}
                </div> */}
                <button
                  className="btn btn-secondary btn-sm rounded-sm"
                  disabled={
                    writeDisabled ||
                    isLoading ||
                    invalidJson ||
                    buildName.length === 0 ||
                    objectTypeIds.length === 0 ||
                    submitBuildPrice === 0n
                  }
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
      <div className="bg-black p-4 border w-1/2" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold text-left mt-4 mb-5">Create Trend {(step + 1).toString()}/5</h1>
          <label className="btn btn-ghost btn-sm btn-circle relative right-3 top-3" onClick={() => closeModal()}>
            ✕
          </label>
        </div>
        {renderStep()}
      </div>
    </div>
  );
};
