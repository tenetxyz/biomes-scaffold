import { useReducer } from "react";
import Link from "next/link";
import { Abi, AbiFunction } from "abitype";
import { TransactionReceipt, formatEther } from "viem";
import { useAccount, useBlockNumber } from "wagmi";
import { DisplayVariable, WriteOnlyFunctionForm, displayTxResult } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const Game: React.FC = ({}) => {
  const { address: connectedAddress } = useAccount();
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");
  const { data: latestBlockNumber } = useBlockNumber({
    watch: true,
  });

  const setIsBiomesClientSetup = useGlobalState(({ setIsBiomesClientSetup }) => setIsBiomesClientSetup);

  if (connectedAddress === undefined) {
    return <div>Connect your wallet to continue</div>;
  }

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

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

  const claimRewardPoolFunctionData = writeFunctions.find(fn => fn.fn.name === "claimRewardPool");

  const isStartedGetter = viewFunctions.find(({ fn }) => fn.name === "isGameStarted");
  const isEndedGetter = viewFunctions.find(({ fn }) => fn.name === "gameEndBlock");
  const registeredPlayersGetter = viewFunctions.find(({ fn }) => fn.name === "getRegisteredPlayerEntityIds");
  const killsGetter = viewFunctions.find(({ fn }) => fn.name === "getKillsLeaderboard");
  const rewardPoolGetter = viewFunctions.find(({ fn }) => fn.name === "getRewardPool");

  if (
    claimRewardPoolFunctionData === undefined ||
    isStartedGetter === undefined ||
    isEndedGetter === undefined ||
    registeredPlayersGetter === undefined ||
    killsGetter === undefined ||
    rewardPoolGetter === undefined
  ) {
    return <div>Missing required functions</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="w-full marquee bg-secondary text-center flex justify-between px-12 items-center">
        <div>
          Kill participating avatars in{" "}
          <a
            href="https://biome1.biomes.aw/"
            rel="noreferrer"
            target="_blank"
            style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}
          >
            Biomes
          </a>
          . Watch Your Stamina & Craft Weapons To Do More Damage.
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
              <div className="flex flex-col gap-5">
                <DisplayVariable
                  abi={deployedContractData.abi as Abi}
                  abiFunction={isStartedGetter.fn}
                  contractAddress={deployedContractData.address}
                  key={"isGameStarted"}
                  refreshDisplayVariables={refreshDisplayVariables}
                  inheritedFrom={isStartedGetter.inheritedFrom}
                  poll={4000}
                >
                  {({ result, RefreshButton }) => {
                    if (result === true) {
                      return (
                        <div className="text-xl font-semibold flex" style={{ color: "rgb(205 202 254)" }}>
                          <div>Game Has Started & Ends At Block:</div>
                          <div>
                            <DisplayVariable
                              abi={deployedContractData.abi as Abi}
                              abiFunction={isEndedGetter.fn}
                              contractAddress={deployedContractData.address}
                              key={"gameEndBlock"}
                              refreshDisplayVariables={refreshDisplayVariables}
                              inheritedFrom={isEndedGetter.inheritedFrom}
                            >
                              {({ result }) => {
                                const numBlocksRemaining =
                                  latestBlockNumber !== undefined && result !== undefined && result !== null
                                    ? result - latestBlockNumber
                                    : 0n;
                                return (
                                  <div className="pl-2">
                                    {displayTxResult(result)}{" "}
                                    <span style={{ color: "#FECACA" }}>
                                      ({numBlocksRemaining.toString()} blocks remaining)
                                    </span>
                                  </div>
                                );
                              }}
                            </DisplayVariable>
                          </div>
                          {RefreshButton}
                        </div>
                      );
                    } else {
                      return (
                        <div
                          className="p-4 flex justify-between text-white text-center border border-white w-full"
                          style={{ border: "1px solid rgb(242 12 12)", background: "rgb(162 50 50)" }}
                        >
                          <div className="text-3xl">⏳</div>
                          <div className="text-xl font-semibold" style={{ color: "#FECACA" }}>
                            Game Hasn&apos;t Started
                          </div>
                          {RefreshButton}
                        </div>
                      );
                    }
                  }}
                </DisplayVariable>

                <DisplayVariable
                  abi={deployedContractData.abi as Abi}
                  abiFunction={registeredPlayersGetter.fn}
                  contractAddress={deployedContractData.address}
                  key={"getRegisteredPlayerEntityIds"}
                  refreshDisplayVariables={refreshDisplayVariables}
                  inheritedFrom={registeredPlayersGetter.inheritedFrom}
                  poll={4000}
                >
                  {({ CopyButton }) => {
                    return (
                      <div style={{ backgroundColor: "#160b21", padding: "16px", border: "1px solid #0e0715" }}>
                        <div className="flex justify-between mb-4 items-center">
                          <div className="text-md font-medium">Import New Avatars To Kill Into Biomes:</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setIsBiomesClientSetup(false)}
                              className="flex items-center gap-2 bg-white/10 border border-white/20 px-2 py-1.5 font-mono uppercase text-sm leading-none transition hover:border-white"
                            >
                              Forgot How to Import?
                            </button>

                            <div className="flex gap-4">{CopyButton}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </DisplayVariable>

                <DisplayVariable
                  abi={deployedContractData.abi as Abi}
                  abiFunction={killsGetter.fn}
                  contractAddress={deployedContractData.address}
                  key={"getKillsLeaderboard"}
                  refreshDisplayVariables={refreshDisplayVariables}
                  inheritedFrom={killsGetter.inheritedFrom}
                  poll={4000}
                >
                  {({ result, RefreshButton }) => {
                    return (
                      <div
                        style={{
                          backgroundColor: "#160b21",
                          padding: "16px",
                          border: "1px solid #0e0715",
                        }}
                      >
                        <div className="flex justify-between mb-4">
                          <div className="text-lg font-medium">Leaderboard</div>
                          <div className="flex gap-4">{RefreshButton}</div>
                        </div>
                        {displayTxResult(result)}
                      </div>
                    );
                  }}
                </DisplayVariable>
              </div>
            </div>
            <div></div>
          </div>
        </div>
        <div
          className="col-span-12 lg:col-span-3 p-12 flex flex-col justify-between"
          style={{ backgroundColor: "#160b21", borderLeft: "1px solid #0e0715" }}
        >
          <div>
            <div className="pb-4">
              <DisplayVariable
                abi={deployedContractData.abi as Abi}
                abiFunction={rewardPoolGetter.fn}
                contractAddress={deployedContractData.address}
                key={"getRewardPool"}
                refreshDisplayVariables={refreshDisplayVariables}
                inheritedFrom={rewardPoolGetter.inheritedFrom}
                poll={4000}
              >
                {({ result, RefreshButton }) => {
                  return (
                    <div
                      className="p-6 text-white text-center border border-white w-full"
                      style={{ backgroundColor: "#42a232" }}
                    >
                      <div className="text-sm font-bold flex justify-center items-center">
                        <span>PRIZE POOL</span> <span>{RefreshButton}</span>
                      </div>
                      {result !== undefined && <div className="text-4xl mt-2">{formatEther(result)}</div>}
                    </div>
                  );
                }}
              </DisplayVariable>
            </div>
            <div className="p-5 divide-y divide-base-300">
              <WriteOnlyFunctionForm
                abi={deployedContractData.abi as Abi}
                key={"claimRewardPool"}
                abiFunction={claimRewardPoolFunctionData.fn}
                onChange={() => {
                  return;
                }}
                onBlockConfirmation={(txnReceipt: TransactionReceipt) => {
                  console.log("txnReceipt", txnReceipt);
                }}
                contractAddress={deployedContractData.address}
                inheritedFrom={claimRewardPoolFunctionData?.inheritedFrom}
              />
            </div>
          </div>

          <div
            className="p-4 flex flex-col gap-2"
            style={{ border: "1px solid rgb(242 222 12)", background: "#854D0E" }}
          >
            <div style={{ borderBottom: "0.5px solid rgb(242 222 12)", textAlign: "center" }} className="pb-4">
              <Link href="/manage">
                <button className="w-full text-center bg-white/10 border border-white/20 px-2 py-1.5 font-mono uppercase text-sm transition hover:border-white">
                  Manage Hooks
                </button>
              </Link>
            </div>
            <div className="text-sm font-semibold" style={{ color: "#FEF08A" }}>
              <div className="pb-4 pt-2">⚠️ You can&apos;t logoff until the game is over.</div>
              <div>Unregister your hooks when done playing!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
