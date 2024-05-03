export const HowToPlayComponent: React.FC = ({}) => {
  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="w-full marquee bg-secondary text-center">
        Sign up and get your avatar in{" "}
        <a href="https://biomes.aw" style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}>
          Biome-1
        </a>{" "}
        before playing this experience!
      </div>

      <div className="p-12 flex flex-col justify-between gap-4">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          1. Import Area, Enter Area, and Don&apos;t Leave
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridGap: "4rem", alignSelf: "center" }}>
          <img
            alt=""
            src="/importareas/four.png"
            style={{ width: "100%", height: "auto" }}
            className="border rounded-sm"
          />
          <img
            alt=""
            src="/importareas/five.png"
            style={{ width: "100%", height: "auto" }}
            className="border rounded-sm"
          />
        </div>

        <img
          alt=""
          src="/importareas/six_alt.png"
          style={{ width: "60%", height: "auto" }}
          className="border rounded-sm"
        />
      </div>

      <div className="p-12 flex flex-col justify-between gap-4">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          2. View Participating Avatars
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
          3. Kill Them But Don&apos;t Die Yourself
        </h2>
        <div className="w-full flex flex-col gap-2 items-center">
          <img alt="" src="/htp_hit.png" style={{ width: "90%", height: "auto" }} className="border rounded-sm" />
          <img alt="" src="/htp_craft.png" style={{ width: "60%", height: "auto" }} className="border rounded-sm" />
        </div>
      </div>

      <div className="p-12 flex flex-col justify-between">
        <h2 className="text-3xl pb-2 text-center">
          After 30 Minutes, Player With Most Kills Can Withdraw Reward Prize Pool
        </h2>
      </div>
    </div>
  );
};
