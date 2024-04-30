import { useReducer } from "react";
import Image from "next/image";
import { Abi, AbiFunction } from "abitype";
import { useAccount } from "wagmi";
import { DisplayVariable } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const SetupBiomesClient: React.FC = ({}) => {
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

  const buildGetter = viewFunctions.find(({ fn }) => fn.name === "getBuild");
  const matchAreaGetter = viewFunctions.find(({ fn }) => fn.name === "getMatchArea");
  const registeredPlayersGetter = viewFunctions.find(({ fn }) => fn.name === "getRegisteredPlayerEntityIds");

  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="p-12 flex flex-col justify-between">
        <h1 className="text-3xl font-bold text-left mt-4">Setup Biomes Client</h1>

        <div className="py-8 px-12">
          <h2 className="text-xl text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
            1. Turn On Show Extensions Toggle
          </h2>
          <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
            <Image alt="" src="/enable_extensions.png" width={200} height={500} className="border rounded-sm" />
          </div>
        </div>

        {matchAreaGetter && (
          <div className="py-8 px-12">
            <h2 className="text-xl text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              2. Import Match Area You Have To Stay Inside
            </h2>
            <div className="pt-2 grid grid-cols-6 gap-4 text-center" style={{ textAlign: "-webkit-center" }}>
              <div className="col-span-1">
                <p>1) Copy match area</p>

                <div style={{ backgroundColor: "#160b21", width: "fit-content", border: "1px solid white" }}>
                  <DisplayVariable
                    abi={deployedContractData.abi as Abi}
                    abiFunction={matchAreaGetter.fn}
                    contractAddress={deployedContractData.address}
                    key={"getMatchArea"}
                    refreshDisplayVariables={refreshDisplayVariables}
                    inheritedFrom={matchAreaGetter.inheritedFrom}
                    poll={2000}
                  >
                    {({ CopyButton }) => {
                      return <div className="items-center text-center font-mono p-1">{CopyButton}</div>;
                    }}
                  </DisplayVariable>
                </div>
              </div>

              <div className="col-span-2">
                <p>2) Click import areas in Biomes & paste</p>
                <Image alt="" src="/import_area_pre.png" width={300} height={500} className="border rounded-sm" />
              </div>

              <div className="col-span-3">
                <p>3) Red borders around area. Area indicator in map.</p>
                <div className="gap-4 flex flex-col items-center">
                  <Image alt="" src="/bordered_area.png" width={450} height={250} className="border rounded-sm" />
                  <Image alt="" src="/map_area.png" width={125} height={220} className="border rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        {registeredPlayersGetter && (
          <div className="py-8 px-12">
            <h2 className="text-xl text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              3. Import Avatars You Have To Kill
            </h2>
            <div className="pt-2 grid grid-cols-6 gap-4 text-center" style={{ textAlign: "-webkit-center" }}>
              <div className="col-span-1">
                <p>1) Copy avatar IDs</p>
                <div style={{ backgroundColor: "#160b21", width: "fit-content", border: "1px solid white" }}>
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
                      return <div className="items-center text-center font-mono p-1">{CopyButton}</div>;
                    }}
                  </DisplayVariable>
                </div>
              </div>

              <div className="col-span-2">
                <p>2) Click import entities in Biomes & paste</p>
                <Image alt="" src="/import_entity_pre.png" width={300} height={500} className="border rounded-sm" />
              </div>

              <div className="col-span-3">
                <p>3) Purple beams on others avatars. Yellow beam on your avatar.</p>
                <div className="gap-4 flex items-center justify-center">
                  <Image alt="" src="/purple_beam.png" width={180} height={430} className="border rounded-sm" />
                  <Image alt="" src="/yellow_beam.png" width={185} height={450} className="border rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        {buildGetter && (
          <div className="py-8 px-12">
            <h2 className="text-xl text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              4. Import Blueprint of Builds You Have to Make
            </h2>
            <div className="pt-2 grid grid-cols-6 gap-4 text-center" style={{ textAlign: "-webkit-center" }}>
              <div className="col-span-1">
                <p>1) Copy build blueprint</p>
                <div style={{ backgroundColor: "#160b21", width: "fit-content", border: "1px solid white" }}>
                  <DisplayVariable
                    abi={deployedContractData.abi as Abi}
                    abiFunction={buildGetter.fn}
                    contractAddress={deployedContractData.address}
                    key={"getBuild"}
                    refreshDisplayVariables={refreshDisplayVariables}
                    inheritedFrom={buildGetter.inheritedFrom}
                    poll={2000}
                  >
                    {({ CopyButton }) => {
                      return <div className="items-center text-center font-mono p-1">{CopyButton}</div>;
                    }}
                  </DisplayVariable>
                </div>
              </div>

              <div className="col-span-2">
                <p>2) Click import builds in Biomes & paste</p>
                <Image alt="" src="/import_area_pre.png" width={300} height={500} className="border rounded-sm" />
              </div>

              <div className="col-span-3">
                <p>3) Place outlines of blueprints in world to get help for building</p>
                <div className="gap-4 flex flex-col items-center">
                  <Image alt="" src="/build_preview.png" width={225} height={250} className="border rounded-sm" />
                  <Image alt="" src="/build_manage.png" width={225} height={220} className="border rounded-sm" />
                  <Image alt="" src="/build_blueprint.png" width={225} height={220} className="border rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="py-8 px-12 mt-4">
          <button
            className="w-full btn btn-primary bg-secondary rounded-sm"
            onClick={() => {
              setIsBiomesClientSetup(true);
            }}
            disabled={false}
          >
            Play Game
          </button>
        </div>
      </div>
    </div>
  );
};
