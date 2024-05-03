import { useState } from "react";
import { ListEntry } from "./Game";
import { useAccount } from "wagmi";
import { BigCopy } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

type ViewBuildModalProps = {
  closeModal: () => void;
  build: ListEntry;
};

export enum ViewBuildModalStep {
  ShowExtensionsToggle,
  ImportBuild,
  OpenBuildView,
}

export const ViewBuildModal: React.FC<ViewBuildModalProps> = ({ closeModal, build }) => {
  const { address: connectedAddress } = useAccount();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");
  const [step, setStep] = useState(ViewBuildModalStep.ShowExtensionsToggle);

  if (connectedAddress === undefined) {
    return <div>Connect your wallet to continue</div>;
  }

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const renderStep = () => {
    switch (step) {
      case ViewBuildModalStep.ShowExtensionsToggle:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              1. Toggle To &quot;Show&quot; in Biomes Client
            </h2>
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/enable_extensions.png" className="border w-full rounded-sm" />
            </div>
            <button
              className="w-full flex cursor-pointer justify-center bg-biomes border border-white/20 px-2 py-1.5 font-mono uppercase text-sm transition hover:border-white"
              onClick={() => {
                setStep(ViewBuildModalStep.ImportBuild);
              }}
            >
              I Have Toggled To &quot;Show&quot;
            </button>
          </div>
        );
      case ViewBuildModalStep.ImportBuild:
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
              className="w-full flex cursor-pointer justify-center bg-biomes border border-white/20 px-2 py-1.5 font-mono uppercase text-sm transition hover:border-white"
              onClick={() => {
                setStep(ViewBuildModalStep.OpenBuildView);
              }}
            >
              I Have Imported The Build
            </button>
          </div>
        );
      case ViewBuildModalStep.OpenBuildView:
        return (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              3. Click On The Build&apos;s Preview Card
            </h2>
            <div className="pt-2" style={{ textAlign: "-webkit-center" }}>
              <img alt="" src="/open_build.png" className="w-full border rounded-sm" />
            </div>
            <button
              className="w-full flex cursor-pointer justify-center bg-white/10 border border-white/20 px-2 py-1.5 font-mono uppercase text-sm transition hover:border-white"
              onClick={() => {
                closeModal();
              }}
            >
              Close
            </button>
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
          <h1 className="text-3xl font-bold text-left mt-4 mb-5">View Build {(step + 1).toString()}/3</h1>
          <label className="btn btn-ghost btn-sm btn-circle relative right-3 top-3" onClick={() => closeModal()}>
            ✕
          </label>
        </div>
        {renderStep()}
      </div>
    </div>
  );
};
