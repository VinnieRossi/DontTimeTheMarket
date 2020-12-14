import NumberFormat from "react-number-format";

interface GameRulesProps {
  gameSpeed: number;
  startingBalance: number;
}

const GameRules = ({
  gameSpeed,
  startingBalance,
}: GameRulesProps): JSX.Element => {
  // return (
  //   <div classNameNameNameName="container mx-auto">
  //     <div classNameNameNameName="container pb-16">
  //       <h1 classNameNameNameName="text-4xl pb-8 pt-8 font-semibold">How it works</h1>
  //       <p classNameNameNameName="pb-4">
  // After clicking Start, one year of historical S&amp;P500 returns will
  // play out on the graph below. Every{" "}
  // <strong>{(gameSpeed * 500) / 1000} seconds</strong>, a day will pass
  // until the end of the year (~253 market days). Each day, you have the
  // option to buy into the market at the current share price, sell your
  // shares for the current share price, or do nothing. Currently this
  // operation is an all-in or all-out, but in the future I might implement
  // incremental purchases.
  //       </p>

  //       <p classNameNameNameName="pb-4">
  // As you attempt to time the market, buying low and selling high, you'll
  // be competing against a "Ghost". This Ghost does not possess the genius
  // that you have, and will instead elect to buy on the first market day
  // and <strong>never</strong> adjust their portfolio. You can monitor how
  // the ghost is doing below your own stats. Easy to beat, right?
  //       </p>

  //       <p classNameNameNameName="pb-4">
  // You also have the option to speed up or slow down the passing of time.
  // That rate can be controlled by the Slow Down and Speed Up buttons. The
  // Start button will also double as a Pause button, should you need to
  // take more time on any given market day.{" "}
  //       </p>

  //       <p classNameNameNameName="pb-4">
  // Your starting portfolio balance is{" "}
  // <strong>
  //   <NumberFormat
  //     value={startingBalance}
  //     decimalScale={2}
  //     fixedDecimalScale
  //     displayType={"text"}
  //     thousandSeparator={true}
  //     prefix={"$"}
  //   />
  // </strong>{" "}
  // and includes no shares, although you can elect to buy in on the first
  // day before starting the game (as the Ghost does). As you make
  // transactions, they will be logged in the Transaction History section.
  // After the market year is up, you can see your all-time high and low
  // there.
  //       </p>

  //       <p>
  // <strong>*Note</strong> This simulation does not include any
  // transaction fees or taxes paid. These are also possible future
  // updates.
  //       </p>
  //     </div>
  //   </div>
  // );

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
        <div className="mt-6 prose prose-indigo prose-lg text-gray-500 mx-auto">
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
            </strong>{" "}
            and includes no shares. As you make transactions, they will be
            logged in the Transaction History section.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameRules;
