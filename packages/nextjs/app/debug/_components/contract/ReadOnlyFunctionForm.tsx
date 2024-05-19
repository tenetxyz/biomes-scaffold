"use client";

import { useEffect, useState } from "react";
import { Copy } from "./DisplayVariable";
import { InheritanceTooltip } from "./InheritanceTooltip";
import {
  areValidBuilds,
  areValidBuildsWithPos,
  isAreaArray,
  isArrayofBytes32,
  isBytes32,
  isValidArea,
  isValidBuild,
  isValidBuildWithPos,
} from "./utilsDisplay";
import { Abi, AbiFunction } from "abitype";
import { Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import {
  ContractInput,
  displayTxResult,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

type ReadOnlyFunctionFormProps = {
  contractAddress: Address;
  abiFunction: AbiFunction;
  inheritedFrom?: string;
  abi: Abi;
};

export const ReadOnlyFunctionForm = ({
  contractAddress,
  abiFunction,
  inheritedFrom,
  abi,
}: ReadOnlyFunctionFormProps) => {
  const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));
  const [result, setResult] = useState<unknown>();
  const { targetNetwork } = useTargetNetwork();
  const { address: connectedAddress } = useAccount();

  const { isFetching, refetch, error } = useReadContract({
    address: contractAddress,
    account: connectedAddress,
    functionName: abiFunction.name,
    abi: abi,
    args: getParsedContractFunctionArgs(form),
    chainId: targetNetwork.id,
    query: {
      enabled: false,
      retry: false,
    },
  });

  useEffect(() => {
    if (error) {
      const parsedError = getParsedError(error);
      notification.error(parsedError);
    }
  }, [error]);

  const transformedFunction = transformAbiFunction(abiFunction);
  const inputElements = transformedFunction.inputs.map((input, inputIndex) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return (
      <ContractInput
        key={key}
        setForm={updatedFormValue => {
          setResult(undefined);
          setForm(updatedFormValue);
        }}
        form={form}
        stateObjectKey={key}
        paramType={input}
      />
    );
  });

  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
      <p className="font-medium my-0 break-words">
        {abiFunction.name}
        <InheritanceTooltip inheritedFrom={inheritedFrom} />
      </p>
      {inputElements}
      <div className="flex justify-between gap-2 flex-wrap">
        <div className="flex-grow w-4/5">
          {result !== null && result !== undefined && (
            <div className="bg-secondary rounded-sm text-sm px-4 py-1.5 break-words">
              <div className="flex">
                <p className="font-bold m-0 mb-1">Result:</p>
                {isValidArea(result) ||
                isAreaArray(result) ||
                isBytes32(result) ||
                isArrayofBytes32(result) ||
                isValidBuild(result) ||
                isValidBuildWithPos(result) ||
                areValidBuilds(result) ||
                areValidBuildsWithPos(result) ? (
                  <Copy result={result} />
                ) : null}
              </div>
              <pre className="whitespace-pre-wrap break-words">{displayTxResult(result)}</pre>
            </div>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm rounded-sm"
          onClick={async () => {
            const { data } = await refetch();
            setResult(data);
          }}
          disabled={isFetching}
        >
          {isFetching && <span className="loading loading-spinner loading-xs"></span>}
          Read
        </button>
      </div>
    </div>
  );
};
