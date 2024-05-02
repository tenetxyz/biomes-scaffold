import React from "react";
import { hardhat } from "viem/chains";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

/**
 * Site footer
 */
export const Footer = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <div
      className="min-h-0 py-5 px-1 mb-11 lg:mb-0 bg-base-100 p-mono"
      style={{ backgroundColor: "#160b21", borderTop: "1px solid #0e0715" }}
    >
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto">
            {isLocalNetwork && (
              <>
                {/* <Faucet /> */}
                {/* <Link
                  href="/blockexplorer"
                  passHref
                  style={{ backgroundColor: "rgb(22, 11, 33)", borderColor: "white" }}
                  className="btn btn-sm rounded-sm font-normal gap-1"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>Block Explorer</span>
                </Link> */}
              </>
            )}
          </div>
          {/* <SwitchTheme className={`pointer-events-auto ${isLocalNetwork ? "self-end md:self-auto" : ""}`} /> */}
        </div>
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="text-center">
              <a href="https://github.com/tenetxyz/biomes-scaffold" target="_blank" rel="noreferrer" className="link">
                Create Your Own Experience
              </a>
            </div>
            <span>·</span>
            <div className="text-center">
              <a href="/debug" className="link">
                Smart Contract
              </a>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
};
