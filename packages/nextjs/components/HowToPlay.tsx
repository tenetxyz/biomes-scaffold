export const HowToPlayComponent: React.FC = ({}) => {
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
      <div className="p-12 flex flex-col justify-between gap-4">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          1. View Participating Avatars
        </h2>
        <div style={{ display: "flex", width: "90%", gap: "4rem", alignSelf: "center" }}>
          <img
            alt=""
            src="/importavatars/four.png"
            style={{ width: "50%", height: "auto" }}
            className="border rounded-sm"
          />
          <img
            alt=""
            src="/importavatars/five.png"
            style={{ width: "50%", height: "auto" }}
            className="border rounded-sm"
          />
        </div>
      </div>

      <div className="p-12 flex flex-col justify-between gap-4">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          2. Hit Them
        </h2>
        <div className="w-full flex flex-col gap-2 items-center">
          <img alt="" src="/htp_hit.png" style={{ width: "90%", height: "auto" }} className="border rounded-sm" />
          <img alt="" src="/htp_craft.png" style={{ width: "60%", height: "auto" }} className="border rounded-sm" />
        </div>
      </div>

      <div className="p-12 flex flex-col justify-between">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          3. Withdraw Your Earnings... If You Survive
        </h2>
        <div
          className="px-4 pt-2 pb-4 mt-4 flex gap-2 flex-col p-6 text-xl text-center"
          style={{ backgroundColor: "#160b21", border: "1px solid #0e0715" }}
        >
          <div>If a participating avatar dies and you hit them last, you get their ether.</div>
          <div>If you survive, withdraw your earned ether every 2 hours.</div>
        </div>
      </div>
    </div>
  );
};
