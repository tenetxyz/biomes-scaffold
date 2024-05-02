import { useReducer } from "react";
import Link from "next/link";
import { Abi, AbiFunction } from "abitype";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { DisplayVariable, WriteOnlyFunctionForm, displayTxResult } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const Game: React.FC = ({}) => {
  const { address: connectedAddress } = useAccount();
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");

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

  const registeredPlayersGetter = viewFunctions.find(({ fn }) => fn.name === "getRegisteredPlayerEntityIds");
  const balancesGetter = viewFunctions.find(({ fn }) => fn.name === "getAllBalances");
  const withdrawalsGetter = viewFunctions.find(({ fn }) => fn.name === "getAllLastWithdrawals");
  const hittersGetter = viewFunctions.find(({ fn }) => fn.name === "getAllLastHitters");
  const leaderboardGetter = viewFunctions.find(({ fn }) => fn.name === "getBalancesLeaderboard");

  const withdrawFunction = writeFunctions.find(fn => fn.fn.name === "withdraw");

  if (
    balancesGetter === undefined ||
    withdrawalsGetter === undefined ||
    hittersGetter === undefined ||
    registeredPlayersGetter === undefined ||
    leaderboardGetter === undefined ||
    withdrawFunction === undefined
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
          </a>{" "}
          to get their ether. Stay alive to keep it. View & withdraw your earnings here.
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
              <div>
                <DisplayVariable
                  abi={deployedContractData.abi as Abi}
                  abiFunction={registeredPlayersGetter.fn}
                  contractAddress={deployedContractData.address}
                  key={"getRegisteredPlayerEntityIds"}
                  refreshDisplayVariables={refreshDisplayVariables}
                  inheritedFrom={registeredPlayersGetter.inheritedFrom}
                  poll={2000}
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
                  abiFunction={leaderboardGetter.fn}
                  contractAddress={deployedContractData.address}
                  key={"getRewardsLeaderboard"}
                  refreshDisplayVariables={refreshDisplayVariables}
                  inheritedFrom={leaderboardGetter.inheritedFrom}
                  poll={2000}
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
                abiFunction={balancesGetter.fn}
                contractAddress={deployedContractData.address}
                key={"getAllBalances"}
                refreshDisplayVariables={refreshDisplayVariables}
                inheritedFrom={balancesGetter.inheritedFrom}
                poll={2000}
              >
                {({ result, RefreshButton }) => {
                  // Find the balance for the connected address
                  const matchingEntry = result?.find(
                    entry => entry.player.toLowerCase() === connectedAddress.toLowerCase(),
                  );
                  const balance = matchingEntry ? matchingEntry.balance.toString() : "0"; // Default to '0' if no match is found

                  return (
                    <div
                      className="p-6 text-white text-center border border-white w-full"
                      style={{ backgroundColor: "#42a232" }}
                    >
                      <div className="text-sm font-bold flex justify-center items-center">
                        <span>Your Balance</span> <span>{RefreshButton}</span>
                      </div>
                      <div className="text-4xl mt-2">{formatEther(balance) + " ETH"}</div>
                    </div>
                  );
                }}
              </DisplayVariable>
            </div>

            <DisplayVariable
              abi={deployedContractData.abi as Abi}
              abiFunction={withdrawalsGetter.fn}
              contractAddress={deployedContractData.address}
              key={"getAllLastWithdrawals"}
              refreshDisplayVariables={refreshDisplayVariables}
              inheritedFrom={withdrawalsGetter.inheritedFrom}
              poll={2000}
            >
              {({ result }) => {
                // Find the balance for the connected address
                const matchingEntry = result?.find(
                  entry => entry.player.toLowerCase() === connectedAddress.toLowerCase(),
                );
                const lastWithdrawal = matchingEntry ? matchingEntry.lastWithdrawal.toString() : "0"; // Default to '0' if no match is found
                const currentTimestamp = Math.floor(Date.now() / 1000);

                if (currentTimestamp - lastWithdrawal > 7200) {
                  return (
                    <WriteOnlyFunctionForm
                      abi={deployedContractData.abi as Abi}
                      key={"claimRewardPool"}
                      abiFunction={withdrawFunction.fn}
                      onChange={() => {
                        return;
                      }}
                      onBlockConfirmation={(txnReceipt: TransactionReceipt) => {
                        console.log("txnReceipt", txnReceipt);
                      }}
                      contractAddress={deployedContractData.address}
                      inheritedFrom={withdrawFunction?.inheritedFrom}
                    />
                  );
                } else {
                  return (
                    <div
                      className="p-4 text-white text-center border border-white w-full"
                      style={{ border: "1px solid rgb(242 12 12)", background: "rgb(162 50 50)" }}
                    >
                      <div className="text-xl pb-2">⏳ {14400 - (currentTimestamp - lastWithdrawal)} Seconds</div>
                      <span className="text-sm font-bold " style={{ color: "#FECACA" }}>
                        Until You Can Withdraw
                      </span>{" "}
                    </div>
                  );
                }
              }}
            </DisplayVariable>
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
              <div className="pb-4 pt-2">⚠️ You can&apos;t logoff until you withdraw your ether or die.</div>
              <div>Unregister your hooks when done playing!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
