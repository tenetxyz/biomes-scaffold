"use client";

import { useEffect, useState } from "react";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { Abi, AbiFunction } from "abitype";
import { Address, TransactionReceipt } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  ContractInput,
  TxReceipt,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { replacer } from "~~/utils/scaffold-eth/common";

type WriteOnlyFunctionFormProps = {
  abi: Abi;
  abiFunction: AbiFunction;
  onChange: () => void;
  contractAddress: Address;
  inheritedFrom?: string;
  onBlockConfirmation?: (txnReceipt: TransactionReceipt) => void;
};

export const WriteOnlyFunctionForm = ({
  abi,
  abiFunction,
  onChange,
  contractAddress,
  onBlockConfirmation,
  inheritedFrom,
}: WriteOnlyFunctionFormProps) => {
  const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));
  const [txValue, setTxValue] = useState<string | bigint>("");
  const { chain } = useAccount();
  const writeTxn = useTransactor();
  const { targetNetwork } = useTargetNetwork();
  const writeDisabled = !chain || chain?.id !== targetNetwork.id;
  const [buttonToShow, setButtonToShow] = useState("");
  const [textInput, setTextInput] = useState("");

  const { data: result, writeContractAsync, isPending } = useWriteContract();

  const handleTextInputChange = event => {
    setTextInput(event.target.value);
  };

  const handleWrite = async () => {
    if (writeContractAsync) {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: contractAddress,
            functionName: abiFunction.name,
            abi: abi,
            args: getParsedContractFunctionArgs(form),
            value: BigInt(txValue),
          });
        await writeTxn(makeWriteWithParams, {
          onBlockConfirmation: onBlockConfirmation,
        });
        onChange();
      } catch (e: any) {
        console.error("⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error", e);
      }
    }
  };

  const [displayedTxResult, setDisplayedTxResult] = useState<TransactionReceipt>();
  const { data: txResult } = useWaitForTransactionReceipt({
    hash: result,
  });
  useEffect(() => {
    setDisplayedTxResult(txResult);
  }, [txResult]);

  // TODO use `useMemo` to optimize also update in ReadOnlyFunctionForm
  const transformedFunction = transformAbiFunction(abiFunction);

  useEffect(() => {
    let detectedButtonType = "";

    const isAddEntityId =
      transformedFunction.inputs.length === 1 &&
      transformedFunction.inputs.some(input => input.name === "_entityId" && input.type === "bytes32");

    const isAddArea =
      transformedFunction.inputs.length === 2 &&
      transformedFunction.inputs.every(input => input.internalType === "struct VoxelCoord" && input.type === "tuple");

    // Detect 'addBuild' and 'addBuildWithPos'
    const hasObjectTypeIds = transformedFunction.inputs.some(
      input => input.name === "objectTypeIds" && input.type === "uint8[]",
    );
    const hasRelativePositions = transformedFunction.inputs.some(
      input =>
        input.name === "relativePositions" && input.internalType === "struct VoxelCoord[]" && input.type === "tuple[]",
    );
    const hasBaseWorldCoord = transformedFunction.inputs.some(
      input => input.name === "baseWorldCoord" && input.internalType === "struct VoxelCoord" && input.type === "tuple",
    );

    // Logic to set detectedButtonType based on conditions
    if (isAddArea) {
      detectedButtonType = "addAreaButton";
    } else if (hasObjectTypeIds && hasRelativePositions && !hasBaseWorldCoord) {
      detectedButtonType = "addBuildButton";
    } else if (hasObjectTypeIds && hasRelativePositions && hasBaseWorldCoord) {
      detectedButtonType = "addBuildWithPosButton";
    } else if (hasBaseWorldCoord) {
      detectedButtonType = "addBaseWorldCoordButton";
    } else if (isAddEntityId) {
      detectedButtonType = "addEntityIdButton";
    }

    setButtonToShow(detectedButtonType);
  }, [transformedFunction]);

  const inputs = transformedFunction.inputs.map((input, inputIndex) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return (
      <ContractInput
        key={key}
        setForm={updatedFormValue => {
          setDisplayedTxResult(undefined);
          setForm(updatedFormValue);
        }}
        form={form}
        stateObjectKey={key}
        paramType={input}
      />
    );
  });
  const zeroInputs = inputs.length === 0 && abiFunction.stateMutability !== "payable";

  const importJson = (importType: "area" | "build" | "baseWorldCoord") => {
    try {
      const parsedJson = JSON.parse(textInput);
      if (importType === "area") {
        if (!parsedJson.lowerSouthwestCorner || !parsedJson.size) {
          throw new Error("Invalid JSON");
        }
        const lowerSouthWestCornerKey = getFunctionInputKey(abiFunction.name, abiFunction.inputs[0], 0);
        const lowerSouthWestCornerValue = JSON.stringify(parsedJson.lowerSouthwestCorner, replacer);
        const sizeKey = getFunctionInputKey(abiFunction.name, abiFunction.inputs[1], 1);
        const sizeValue = JSON.stringify(parsedJson.size, replacer);
        setForm(form => ({ ...form, [lowerSouthWestCornerKey]: lowerSouthWestCornerValue, [sizeKey]: sizeValue }));
      } else if (importType === "baseWorldCoord") {
        if (!parsedJson.baseWorldCoord) {
          throw new Error("Invalid JSON");
        }
        const baseWorldCoordKey = getFunctionInputKey(abiFunction.name, abiFunction.inputs[0], 2);
        const baseWorldCoordValue = JSON.stringify(parsedJson.baseWorldCoord, replacer);
        const newForm = {
          ...form,
          [baseWorldCoordKey]: baseWorldCoordValue,
        };
        setForm(newForm);
      } else if (importType === "build") {
        // validate JSON
        if (!parsedJson.objectTypeIds || !parsedJson.relativePositions) {
          throw new Error("Invalid JSON");
        }
        const objectTypeIdsKey = getFunctionInputKey(abiFunction.name, abiFunction.inputs[0], 0);
        const objectTypeIdsValue = JSON.stringify(parsedJson.objectTypeIds, replacer);
        const relativePositions = getFunctionInputKey(abiFunction.name, abiFunction.inputs[1], 1);
        const relativePositionsValue = JSON.stringify(parsedJson.relativePositions, replacer);
        const newForm = {
          ...form,
          [objectTypeIdsKey]: objectTypeIdsValue,
          [relativePositions]: relativePositionsValue,
        };
        if (abiFunction.inputs.length === 3) {
          const baseWorldCoordKey = getFunctionInputKey(abiFunction.name, abiFunction.inputs[2], 2);
          const baseWorldCoordValue = JSON.stringify(parsedJson.baseWorldCoord, replacer);
          newForm[baseWorldCoordKey] = baseWorldCoordValue;
        }
        setForm(newForm);
      }
    } catch (e) {
      alert("Invalid JSON");
    }
  };

  return (
    <div className="py-5 space-y-3 first:pt-0 last:pb-1">
      <div className={`flex gap-3 ${zeroInputs ? "flex-row justify-between items-center" : "flex-col"}`}>
        {buttonToShow === "addBuildButton" && (
          <div>
            <p className="font-medium my-0 break-words pb-4 flex justify-between">
              <div>
                {abiFunction.name}
                <InheritanceTooltip inheritedFrom={inheritedFrom} />
              </div>
            </p>
            <textarea
              value={textInput}
              onChange={handleTextInputChange}
              style={{ padding: "8px", background: "white", color: "black", width: "100%" }}
              placeholder="Paste Build JSON From Biomes"
              rows={4}
              cols={20}
            />
            <button className="btn btn-sm rounded-sm" onClick={() => importJson("build")}>
              Import Build JSON
            </button>
            <hr className="my-8" />
            {inputs}
          </div>
        )}

        {buttonToShow === "addBuildWithPosButton" && (
          <div>
            <p className="font-medium my-0 break-words pb-4 flex justify-between">
              <div>
                {abiFunction.name}
                <InheritanceTooltip inheritedFrom={inheritedFrom} />
              </div>
            </p>
            <textarea
              value={textInput}
              onChange={handleTextInputChange}
              style={{ padding: "8px", background: "white", color: "black", width: "100%" }}
              placeholder="Paste Build JSON From Biomes"
              rows={4}
              cols={20}
            />
            <button className="btn btn-sm rounded-sm" onClick={() => importJson("build")}>
              Import Build JSON
            </button>
            <hr className="my-8" />
            {inputs}
          </div>
        )}

        {buttonToShow === "addBaseWorldCoordButton" && (
          <div>
            <p className="font-medium my-0 break-words pb-4 flex justify-between">
              <div>
                {abiFunction.name}
                <InheritanceTooltip inheritedFrom={inheritedFrom} />
              </div>
            </p>
            <textarea
              value={textInput}
              onChange={handleTextInputChange}
              style={{ padding: "8px", background: "white", color: "black", width: "100%" }}
              placeholder="Paste Build JSON From Biomes"
              rows={4}
              cols={20}
            />
            <button className="btn btn-sm rounded-sm" onClick={() => importJson("baseWorldCoord")}>
              Import Build JSON
            </button>
            <hr className="my-8" />
            {inputs}
          </div>
        )}

        {buttonToShow === "addAreaButton" && (
          <div>
            <p className="font-medium my-0 break-words pb-4 flex justify-between">
              <div>
                {abiFunction.name}
                <InheritanceTooltip inheritedFrom={inheritedFrom} />
              </div>
            </p>
            <textarea
              value={textInput}
              onChange={handleTextInputChange}
              style={{ padding: "8px", background: "white", color: "black", width: "100%" }}
              placeholder="Paste Area JSON From Biomes"
              rows={4}
              cols={20}
            />
            <button className="btn btn-sm rounded-sm" onClick={() => importJson("area")}>
              Import Area JSON
            </button>
            <hr className="my-8" />
            {inputs}
          </div>
        )}

        {buttonToShow !== "addBuildButton" &&
          buttonToShow !== "addBuildWithPosButton" &&
          buttonToShow !== "addBaseWorldCoordButton" &&
          buttonToShow !== "addAreaButton" && (
            <div>
              <p className="font-medium my-0 break-words pb-4">
                {abiFunction.name}
                <InheritanceTooltip inheritedFrom={inheritedFrom} />
              </p>
              {inputs}
            </div>
          )}

        {abiFunction.stateMutability === "payable" ? (
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center ml-2">
              <span className="text-xs font-medium mr-2 leading-none">payable value</span>
              <span className="block text-xs font-extralight leading-none">wei</span>
            </div>
            <IntegerInput
              value={txValue}
              onChange={updatedTxValue => {
                setDisplayedTxResult(undefined);
                setTxValue(updatedTxValue);
              }}
              placeholder="value (wei)"
            />
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          {!zeroInputs && (
            <div className="flex-grow basis-0">
              {displayedTxResult ? <TxReceipt txResult={displayedTxResult} /> : null}
            </div>
          )}
          <div
            className={`flex ${
              writeDisabled &&
              "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
            }`}
            data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
          >
            <button
              className="btn btn-secondary btn-sm rounded-sm"
              disabled={writeDisabled || isPending}
              onClick={handleWrite}
            >
              {isPending && <span className="loading loading-spinner loading-xs"></span>}
              Send
            </button>
          </div>
        </div>
      </div>
      {zeroInputs && txResult ? (
        <div className="flex-grow basis-0">
          <TxReceipt txResult={txResult} />
        </div>
      ) : null}
    </div>
  );
};
