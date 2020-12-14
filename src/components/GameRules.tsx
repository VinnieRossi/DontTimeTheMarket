import NumberFormat from "react-number-format";

interface GameRulesProps {
  gameSpeed: number;
  startingBalance: number;
}

const GameRules = ({
  gameSpeed,
  startingBalance,
}: GameRulesProps): JSX.Element => {
  return (
    <div className="relative py-16 bg-white overflow-hidden">
      <div className="hidden lg:block lg:absolute lg:inset-y-0 lg:h-full lg:w-full">
        <div
          className="relative h-full text-lg max-w-prose mx-auto"
          aria-hidden="true"
        ></div>
      </div>
      <div className="relative px-4 sm:px-6 lg:px-8">
        <div className="text-lg max-w-prose mx-auto">
          <h1>
            <span className="mt-2 block text-3xl text-center leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Think you can beat the market? Prove it.
            </span>
          </h1>
        </div>
        <div className="mt-6 prose-indigo text-gray-500">
          <p className="pb-4">
            After clicking Start, one year of historical S&amp;P500 returns will
            play out on the graph below. Every{" "}
            <strong>{(gameSpeed * 500) / 1000} seconds</strong>, a day will pass
            until the end of the year (~253 market days). Each day, you have the
            option to buy into the market at the current share price, sell your
            shares for the current share price, or do nothing.
          </p>
          <p className="pb-4">
            As you attempt to time the market, buying low and selling high,
            you'll be competing against a "Ghost" who will buy on the first
            market day and <strong>never</strong> adjust their portfolio.
          </p>
          <p>
            Your starting portfolio balance is{" "}
            <strong>
              <NumberFormat
                value={startingBalance}
                decimalScale={2}
                fixedDecimalScale
                displayType={"text"}
                thousandSeparator={true}
                prefix={"$"}
              />
            </strong>
            . Good luck!
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameRules;
