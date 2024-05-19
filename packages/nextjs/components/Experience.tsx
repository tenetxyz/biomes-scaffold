import { useReducer } from "react";
import { Abi, AbiFunction } from "abitype";
import { TransactionReceipt } from "viem";
import { useAccount } from "wagmi";
import { DisplayVariable, WriteOnlyFunctionForm, displayTxResult } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const Experience: React.FC = ({}) => {
  const { address: connectedAddress } = useAccount();
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Experience");

  if (connectedAddress === undefined) {
    return <div>Connect your wallet to continue</div>;
  }

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const writeFunctions = ((deployedContractData.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
    .filter(fn => {
      const isWriteableFunction =
        fn.stateMutability !== "view" &&
        fn.stateMutability !== "pure" &&
        fn.name !== "onAfterCallSystem" &&
        fn.name !== "onBeforeCallSystem" &&
        fn.name !== "onRegisterHook" &&
        fn.name !== "onUnregisterHook" &&
        fn.name !== "canUnregister";
      return isWriteableFunction;
    })
    .map(fn => {
      return {
        fn,
        inheritedFrom: ((deployedContractData as GenericContract)?.inheritedFunctions as InheritedFunctions)?.[fn.name],
      };
    })
    .sort((a, b) => (b.inheritedFrom ? b.inheritedFrom.localeCompare(a.inheritedFrom) : 1));

  const viewFunctions = ((deployedContractData.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
    .filter(fn => {
      const isQueryableWithNoParams =
        (fn.stateMutability === "view" || fn.stateMutability === "pure") && fn.inputs.length === 0;
      return isQueryableWithNoParams;
    })
    .map(fn => {
      return {
        fn,
        inheritedFrom: ((deployedContractData as GenericContract)?.inheritedFunctions as InheritedFunctions)?.[fn.name],
      };
    })
    .sort((a, b) => (b.inheritedFrom ? b.inheritedFrom.localeCompare(a.inheritedFrom) : 1));

  const withdraw = writeFunctions.find(fn => fn.fn.name === "withdraw");
  const withdrawTool = writeFunctions.find(fn => fn.fn.name === "withdrawTool");
  const getNumItemsInVaultChest = viewFunctions.find(({ fn }) => fn.name === "getNumItemsInVaultChest");

  if (withdraw === undefined || withdrawTool === undefined || getNumItemsInVaultChest === undefined) {
    return <div>Missing required functions</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="w-full marquee bg-secondary text-center flex justify-between px-12 items-center">
        <div>
          Play in{" "}
          <a
            href="https://biome1.biomes.aw/"
            rel="noreferrer"
            target="_blank"
            style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}
          >
            Biomes
          </a>{" "}
        </div>
        <div>
          <a
            href="/how-to-play"
            className="flex items-center bg-white/10 border border-white/20 px-2 py-1.5 font-mono uppercase text-sm leading-none transition hover:border-white"
          >
            How To Play
          </a>
        </div>
      </div>

      <div className="grid grid-cols-12 flex flex-1">
        <div className="col-span-12 lg:col-span-9 p-12 flex flex-col justify-between items-center">
          <div style={{ width: "80%" }} className="flex flex-col gap-12">
            <div>
              <h1 className="text-3xl font-bold text-left mt-4">Vault Guard Service</h1>
              <h1 className="text-left mt-4" style={{ lineHeight: "normal", margin: "0", wordWrap: "break-word" }}>
                Transfer your items for safe-guarding by the chest
              </h1>
            </div>
            <div>
              <div className="p-5 divide-y divide-base-300">
                <WriteOnlyFunctionForm
                  abi={deployedContractData.abi as Abi}
                  key={"withdraw"}
                  abiFunction={withdraw.fn}
                  onChange={() => {
                    return;
                  }}
                  onBlockConfirmation={(txnReceipt: TransactionReceipt) => {
                    console.log("txnReceipt", txnReceipt);
                  }}
                  contractAddress={deployedContractData.address}
                  inheritedFrom={withdraw?.inheritedFrom}
                />
              </div>
              <div className="p-5 divide-y divide-base-300">
                <WriteOnlyFunctionForm
                  abi={deployedContractData.abi as Abi}
                  key={"withdrawTool"}
                  abiFunction={withdrawTool.fn}
                  onChange={() => {
                    return;
                  }}
                  onBlockConfirmation={(txnReceipt: TransactionReceipt) => {
                    console.log("txnReceipt", txnReceipt);
                  }}
                  contractAddress={deployedContractData.address}
                  inheritedFrom={withdrawTool?.inheritedFrom}
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className="col-span-12 lg:col-span-3 p-12"
          style={{ backgroundColor: "#160b21", borderLeft: "1px solid #0e0715" }}
        >
          {getNumItemsInVaultChest && (
            <DisplayVariable
              abi={deployedContractData.abi as Abi}
              abiFunction={getNumItemsInVaultChest.fn}
              contractAddress={deployedContractData.address}
              key={"getter"}
              refreshDisplayVariables={refreshDisplayVariables}
              inheritedFrom={getNumItemsInVaultChest.inheritedFrom}
              poll={10000}
            >
              {({ result, RefreshButton }) => {
                return (
                  <div
                    className="p-6 text-white text-center border border- border-white w-full"
                    style={{ backgroundColor: "#42a232" }}
                  >
                    <div className="text-sm font-bold flex justify-center items-center">
                      <span>Num Items In Vault</span> <span>{RefreshButton}</span>
                    </div>
                    <div className="text-4xl mt-2">{displayTxResult(result)}</div>
                  </div>
                );
              }}
            </DisplayVariable>
          )}
        </div>
      </div>
    </div>
  );
};
