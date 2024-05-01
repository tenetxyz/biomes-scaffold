import { useState } from "react";
import Image from "next/image";
import { Hex } from "viem";
import { saveBurnerSK } from "~~/hooks/scaffold-eth";

type ChangeAccountModalProps = {
  modalId: string;
};

export const InitBurnerAccountModal = ({ modalId }: ChangeAccountModalProps) => {
  const [newPrivateKey, setNewPrivateKey] = useState("");

  return (
    <>
      <div>
        <input type="checkbox" id={`${modalId}`} className="modal-toggle" />
        <label htmlFor={`${modalId}`} className="modal cursor-pointer">
          <label className="modal-box relative">
            {/* dummy input to capture event onclick on modal box */}
            <input className="h-0 w-0 absolute top-0 left-0" />
            <label htmlFor={`${modalId}`} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
              ✕
            </label>
            <div className="space-y-3 py-6">
              <div className="flex space-x-4 flex-col items-center gap-6">
                <h2>Paste Burner Wallet Private Key From Biomes</h2>
                <Image alt="SE2 logo" src="/burner_copy.png" width={700} height={500} />
                <div className={`flex flex-col`} style={{ backgroundColor: "white" }}>
                  <input
                    className="font-mono input input-ghost focus-within:border-transparent focus:outline-none focus:bg-transparent focus:text-gray-400 h-[2.2rem] min-h-[2.2rem] px-4 border w-full font-medium placeholder:text-accent/50 text-gray-400"
                    placeholder={"Paste private key"}
                    value={newPrivateKey}
                    onChange={e => setNewPrivateKey(e.target.value)}
                    disabled={false}
                    autoComplete="off"
                    // ref={inputReft}
                    // onFocus={onFocus}
                  />
                  <button
                    className="btn btn-primary bg-secondary rounded-sm btn-sm"
                    onClick={() => {
                      if (newPrivateKey.startsWith("0x")) {
                        saveBurnerSK(newPrivateKey as Hex);
                        // refresh page
                        window.location.reload();
                      } else {
                        alert("Invalid private key");
                      }
                    }}
                    disabled={false}
                  >
                    Setup Burner Account
                  </button>
                </div>
              </div>
            </div>
          </label>
        </label>
      </div>
    </>
  );
};
