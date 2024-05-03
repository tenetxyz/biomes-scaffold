import { useReducer, useState } from "react";
import { CreateBuildModal } from "./CreateBuildModal";
import { SubmitBuildModal } from "./SubmitBuildModal";
import { ViewBuildModal } from "./ViewBuildModal";
import { VoxelCoord } from "@latticexyz/utils";
import { Abi, AbiFunction } from "abitype";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Build, DisplayVariable, displayTxResult } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export interface ListEntry {
  id: bigint;
  name: string;
  price: bigint;
  builders: string[];
  blueprint: Build;
  locations: VoxelCoord[];
}

export const Game: React.FC = ({}) => {
  const { address: connectedAddress } = useAccount();
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");
  const [modalOpenId, setModalOpenId] = useState("");
  const [selectedBuild, setSelectedBuild] = useState<ListEntry | undefined>(undefined);

  const handleCloseModal = () => {
    setModalOpenId("");
    setSelectedBuild(undefined);
  };

  if (connectedAddress === undefined) {
    return <div>Connect your wallet to continue</div>;
  }

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const readFunctions = ((deployedContractData.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
    .filter(fn => {
      const isReadableFunction = fn.stateMutability === "view";
      return isReadableFunction;
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

  const earnedGetter = readFunctions.find(({ fn }) => fn.name === "getEarned");

  const namesGetter = readFunctions.find(({ fn }) => fn.name === "getAllNames");
  const pricesGetter = readFunctions.find(({ fn }) => fn.name === "getAllSubmissionPrices");
  const buildersGetter = readFunctions.find(({ fn }) => fn.name === "getAllBuilders");
  const locationsGetter = readFunctions.find(({ fn }) => fn.name === "getAllLocations");
  const blueprintsGetter = readFunctions.find(({ fn }) => fn.name === "getAllBlueprints");
  const listGetter = readFunctions.find(({ fn }) => fn.name === "getList");

  const createBuild = writeFunctions.find(({ fn }) => fn.name === "create");
  const challengeBuild = writeFunctions.find(({ fn }) => fn.name === "challengeBuilding");

  if (
    earnedGetter === undefined ||
    namesGetter === undefined ||
    pricesGetter === undefined ||
    buildersGetter === undefined ||
    locationsGetter === undefined ||
    blueprintsGetter === undefined ||
    listGetter === undefined ||
    createBuild === undefined ||
    challengeBuild === undefined
  ) {
    return <div>Missing required functions</div>;
  }

  return (
    <>
      <div className="flex-1 flex flex-col h-full p-mono">
        <div className="grid grid-cols-12 flex flex-1">
          <div className="col-span-12 lg:col-span-9 p-12 flex flex-col justify-between items-center">
            <div style={{ width: "100%" }} className="flex flex-col gap-12">
              <div className="flex flex-row gap-12">
                <button
                  className="btn btn-primary bg-secondary rounded-sm font-extrabold"
                  onClick={() => {
                    setModalOpenId("create-build-modal");
                  }}
                >
                  Start New Trend
                </button>
                {/* <button
                  className="btn btn-outline btn-error rounded-sm font-extrabold"
                  onClick={() =>
                    handleOpenModal(
                      <WriteOnlyFunctionForm
                        abi={deployedContractData.abi as Abi}
                        key={"challengeBuild"}
                        abiFunction={challengeBuild.fn}
                        onChange={() => {
                          return;
                        }}
                        onBlockConfirmation={(txnReceipt: TransactionReceipt) => {
                          console.log("txnReceipt", txnReceipt);
                        }}
                        contractAddress={deployedContractData.address}
                        inheritedFrom={challengeBuild?.inheritedFrom}
                      />,
                    )
                  }
                >
                  Challenge Existing Build
                </button> */}
              </div>

              <div style={{ fontFamily: "monospace", width: "100%" }}>
                <div style={{ fontFamily: "monospace", width: "100%", overflowX: "auto" }}>
                  <DisplayVariable
                    abi={deployedContractData.abi as Abi}
                    abiFunction={listGetter.fn}
                    contractAddress={deployedContractData.address}
                    key={"getList"}
                    refreshDisplayVariables={refreshDisplayVariables}
                    inheritedFrom={listGetter.inheritedFrom}
                    poll={2000}
                  >
                    {({ result }) => {
                      return (
                        <div style={{ backgroundColor: "#160b21", padding: "16px", border: "1px solid #0e0715" }}>
                          <div style={{ fontFamily: "monospace", width: "100%" }}>
                            <div style={{ fontFamily: "monospace", width: "100%", overflowX: "auto" }}>
                              <div className="pb-4 text-2xl">Trends</div>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr>
                                    <th
                                      style={{
                                        width: "5%",
                                        border: "0.5px solid #ffffff47",
                                        padding: "8px",
                                        textAlign: "left",
                                      }}
                                    >
                                      ID
                                    </th>
                                    <th
                                      style={{
                                        width: "17.5%",
                                        border: "0.5px solid #ffffff47",
                                        padding: "8px",
                                        textAlign: "left",
                                      }}
                                    >
                                      Name
                                    </th>
                                    <th
                                      style={{
                                        width: "17.5%",
                                        border: "0.5px solid #ffffff47",
                                        padding: "8px",
                                        textAlign: "left",
                                      }}
                                    >
                                      Join Fee
                                    </th>
                                    <th
                                      style={{
                                        width: "30%",
                                        border: "0.5px solid #ffffff47",
                                        padding: "8px",
                                        textAlign: "left",
                                      }}
                                    >
                                      Builders
                                    </th>
                                    <th
                                      style={{
                                        width: "15%",
                                        border: "0.5px solid #ffffff47",
                                        padding: "8px",
                                        textAlign: "left",
                                      }}
                                    >
                                      View
                                    </th>
                                    <th
                                      style={{
                                        width: "15%",
                                        border: "0.5px solid #ffffff47",
                                        padding: "8px",
                                        textAlign: "left",
                                      }}
                                    >
                                      Join Trend
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {result?.map((entry, index) => (
                                    <tr key={index}>
                                      <td
                                        style={{
                                          width: "5%",
                                          border: "0.5px solid #ffffff47",
                                          padding: "8px",
                                          textAlign: "left",
                                          verticalAlign: "text-top",
                                        }}
                                      >
                                        {entry.id.toString()}
                                      </td>
                                      <td
                                        style={{
                                          width: "17.5%",
                                          border: "0.5px solid #ffffff47",
                                          padding: "8px",
                                          textAlign: "left",
                                          verticalAlign: "text-top",
                                        }}
                                      >
                                        {entry.name}
                                      </td>
                                      <td
                                        style={{
                                          width: "17.5%",
                                          border: "0.5px solid #ffffff47",
                                          padding: "8px",
                                          textAlign: "left",
                                          verticalAlign: "text-top",
                                        }}
                                      >
                                        {formatEther(entry.price) + " Ξ"}
                                      </td>
                                      <td
                                        style={{
                                          width: "30%",
                                          border: "0.5px solid #ffffff47",
                                          padding: "8px",
                                          textAlign: "left",
                                        }}
                                      >
                                        <div style={{ overflowY: "scroll", maxHeight: "140px" }}>
                                          {entry.builders.map((builder, index) => (
                                            <div
                                              key={index}
                                              className="bg-[#0c0612] p-4 flex flex-col gap-2 rounded-sm border border-white border-opacity-20 mb-2"
                                            >
                                              <div>{displayTxResult(builder)}</div>
                                              <div>
                                                {entry.locations[index] && (
                                                  <div className="flex gap-2">
                                                    <span className="font-semibold">X:</span> {entry.locations[index].x}
                                                    ,<span className="font-semibold">Y:</span>{" "}
                                                    {entry.locations[index].y},<span className="font-semibold">Z:</span>{" "}
                                                    {entry.locations[index].z}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          width: "15%",
                                          border: "0.5px solid #ffffff47",
                                          padding: "8px",
                                          textAlign: "left",
                                          verticalAlign: "text-top",
                                        }}
                                      >
                                        <label
                                          htmlFor="view-build-modal"
                                          className="w-full flex cursor-pointer justify-center bg-white/10 border border-white/20 px-2 py-1.5 font-mono uppercase text-sm transition hover:border-white"
                                          onClick={() => {
                                            setSelectedBuild(entry);
                                            setModalOpenId("view-build-modal");
                                          }}
                                        >
                                          View Build
                                        </label>
                                      </td>
                                      <td
                                        style={{
                                          width: "15%",
                                          border: "0.5px solid #ffffff47",
                                          padding: "8px",
                                          textAlign: "left",
                                          verticalAlign: "text-top",
                                        }}
                                      >
                                        <button
                                          className="w-full flex justify-center bg-biomes border border-white/20 px-2 py-1.5 font-mono uppercase text-sm transition hover:border-white"
                                          onClick={() => {
                                            setSelectedBuild(entry);
                                            setModalOpenId("submit-build-modal");
                                          }}
                                        >
                                          Submit Build
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </DisplayVariable>
                </div>
              </div>
            </div>
          </div>
          <div
            className="col-span-12 lg:col-span-3 p-12"
            style={{ backgroundColor: "#160b21", borderLeft: "1px solid #0e0715" }}
          >
            <DisplayVariable
              abi={deployedContractData.abi as Abi}
              abiFunction={earnedGetter.fn}
              contractAddress={deployedContractData.address}
              key={"getEarned"}
              refreshDisplayVariables={refreshDisplayVariables}
              inheritedFrom={earnedGetter.inheritedFrom}
              poll={2000}
            >
              {({ result }) => {
                return (
                  <div
                    className="p-6 text-white text-center border border-white w-full"
                    style={{ backgroundColor: "#42a232" }}
                  >
                    <div className="text-sm font-bold flex justify-center items-center">
                      <span>Your Earnings</span>
                    </div>
                    <div className="text-4xl mt-2">
                      {result !== null && result !== undefined && (
                        <pre className="whitespace-pre-wrap break-words">{formatEther(result) + " ETH"}</pre>
                      )}
                    </div>
                  </div>
                );
              }}
            </DisplayVariable>
          </div>
        </div>
      </div>
      {modalOpenId === "create-build-modal" && <CreateBuildModal closeModal={handleCloseModal} />}
      {modalOpenId === "view-build-modal" && selectedBuild !== undefined && (
        <ViewBuildModal build={selectedBuild} closeModal={handleCloseModal} />
      )}
      {modalOpenId === "submit-build-modal" && selectedBuild !== undefined && (
        <SubmitBuildModal build={selectedBuild} closeModal={handleCloseModal} />
      )}
    </>
  );
};
