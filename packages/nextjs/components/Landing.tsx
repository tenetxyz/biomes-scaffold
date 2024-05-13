import { useReducer } from "react";
import { Abi, AbiFunction } from "abitype";
import { DisplayVariable, displayTxResult } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const Landing: React.FC = ({}) => {
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const viewFunctions = ((deployedContractData?.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
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

  const basicGetterFn = viewFunctions.find(({ fn }) => fn.name === "basicGetter");

  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="w-full marquee bg-secondary text-center">
        Sign up and get your avatar in{" "}
        <a
          href="https://biome1.biomes.aw"
          rel="noreferrer"
          target="_blank"
          style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}
        >
          Biome-1
        </a>{" "}
        before playing this experience!
      </div>
      <div className="grid grid-cols-12 flex flex-1">
        <div className="col-span-12 lg:col-span-9 p-12 flex flex-col justify-between items-center">
          
          <div style={{ width: "80%"}}>
            
            <div style={{display: "flex",justifyContent: "space-between", alignItems: "row"}}>
              <div>
                <h1 className="text-3xl font-bold text-left mt-4">Biocash</h1>
                <h1 className="text-left mt-4" style={{ lineHeight: "normal", margin: "0", wordWrap: "break-word" }}>
                Introducing a digital currency to the ecosystem of Biomes.
                </h1>
              </div>
              <img src="/Biocash.png" alt="Biocash token" style={{ width: "auto", height: "100px" }} />
              
            </div>
            <div
             style={{
              border: "1px solid white",
              width: "auto", // Let width remain auto
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#000", // Optional: Background color
              color: "#fff", // Text color
              fontSize: "20px", // Adjust font size as needed
              overflow: "hidden", // Keeps everything neat
              marginBottom: "30px",
            }}
              className="mt-4"
            >
              <img src="/BiocashMarket.png" alt="Biomes market" style={{ width: "100%", height: "auto",}} />
              
            </div>
            <p>
              Biocash enhances the economic aspect of Biomes fully on-chain interactive voxel experience. The token enables players to engage in sophisticated trading activities, allowing them to buy, sell, or barter items with NPC merchants within the game's expansive open world. By integrating Biocash Biomes transforms into a dynamic economic platform where players can experience the value and impact of a digital economy in a virtual setting.
            </p>
          </div>
        </div>
        <div
          className="col-span-12 lg:col-span-3 p-12"
          style={{ backgroundColor: "#160b21", borderLeft: "1px solid #0e0715" }}
        >
          {basicGetterFn && (
            <DisplayVariable
              abi={deployedContractData.abi as Abi}
              abiFunction={basicGetterFn.fn}
              contractAddress={deployedContractData.address}
              key={"getter"}
              refreshDisplayVariables={refreshDisplayVariables}
              inheritedFrom={basicGetterFn.inheritedFrom}
              poll={10000}
            >
              {({ result, RefreshButton }) => {
                return (
                  <div
                    className="p-6 text-white text-center border border- border-white w-full"
                    style={{ backgroundColor: "#42a232" }}
                  >
                    <div className="text-sm font-bold flex justify-center items-center">
                      <span>YOUR GETTER</span> <span>{RefreshButton}</span>
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
