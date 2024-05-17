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

      <div className="p-12 flex flex-col justify-between">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          Architectural Trends
        </h2>
        <div
          className="px-4 pt-2 pb-4 mt-4 flex gap-4 flex-col p-6 text-xl text-left"
          style={{ backgroundColor: "#160b21", border: "1px solid #0e0715" }}
        >
          <div>
            A trend is defined by the blueprint of a build and a submission fee. To join a trend, you must build as per
            the blueprint and pay the submission fee.
          </div>
          <img
            alt=""
            src="/htp_blueprint.png"
            style={{ width: "90%", height: "auto" }}
            className="border rounded-sm text-center"
          />

          <div>
            Your submission fee is split amongst all existing builders of the trend. After joining the trend, you earn a
            split of the submission fee from all future builders.
          </div>
        </div>
      </div>

      <div className="p-12 flex flex-col justify-between gap-4">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          What You Can Do
        </h2>
        <div
          className="px-4 pt-2 pb-4 mt-4 flex gap-4 flex-col p-6 text-xl text-left"
          style={{ backgroundColor: "#160b21", border: "1px solid #0e0715" }}
        >
          <div>Start a trend: create a blueprint, name your trend, and set its submission fee.</div>

          <div>
            Join a trend: build as per the blueprint, submit its position in the world and pay the submission fee. Earn
            from the submission fee of all future builders.
          </div>

          <div>
            Challenge a build: If a building that previously joined a trend no longer exists in the world, it will be
            removed and will no longer receive a share of the submission fees.
          </div>
        </div>
      </div>
    </div>
  );
};
