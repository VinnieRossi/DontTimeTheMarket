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
    <div className="container mx-auto">
      <div className="container pb-16">
        <h1 className="text-4xl pb-8 pt-8 font-semibold">How it works</h1>
        <p className="pb-4">
          After clicking Start, one year of historical S&amp;P500 returns will
          play out on the graph below. Every{" "}
          <strong>{(gameSpeed * 500) / 1000} seconds</strong>, a day will pass
          until the end of the year (~253 market days). Each day, you have the
          option to buy into the market at the current share price, sell your
          shares for the current share price, or do nothing. Currently this
          operation is an all-in or all-out, but in the future I might implement
          incremental purchases.
        </p>

        <p className="pb-4">
          As you attempt to time the market, buying low and selling high, you'll
          be competing against a "Ghost". This Ghost does not possess the genius
          that you have, and will instead elect to buy on the first market day
          and <strong>never</strong> adjust their portfolio. You can monitor how
          the ghost is doing below your own stats. Easy to beat, right?
        </p>

        <p className="pb-4">
          You also have the option to speed up or slow down the passing of time.
          That rate can be controlled by the Slow Down and Speed Up buttons. The
          Start button will also double as a Pause button, should you need to
          take more time on any given market day.{" "}
        </p>

        <p className="pb-4">
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
          and includes no shares, although you can elect to buy in on the first
          day before starting the game (as the Ghost does). As you make
          transactions, they will be logged in the Transaction History section.
          After the market year is up, you can see your all-time high and low
          there.
        </p>

        <p>
          <strong>*Note</strong> This simulation does not include any
          transaction fees or taxes paid. These are also possible future
          updates.
        </p>
      </div>
    </div>
  );
};

export default GameRules;
