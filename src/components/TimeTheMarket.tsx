import { Link } from "@material-ui/core";
import React, { useEffect, useMemo, useState } from "react";
import { Chart } from "react-charts";
import NumberFormat from "react-number-format";
import useInterval from "use-interval";
import BuySellStartControls from "./BuySellStartControls";
import GameRules from "./GameRules";
import GameSpeedControls from "./GameSpeedControls";
import PortfolioDetails from "./PortfolioDetails";
import TransactionHistory from "./TransactionHistory";

import nineteenseventyfive from "../assets/json/1975.json";
import nineteeneightyeight from "../assets/json/1975.json";
import nineteenninetynine from "../assets/json/1975.json";
import twothousandeight from "../assets/json/2008.json";
import twentytwelve from "../assets/json/2012.json";
import twentynineteen from "../assets/json/2019.json";

const years = [
  nineteenseventyfive,
  nineteeneightyeight,
  nineteenninetynine,
  twothousandeight,
  twentytwelve,
  twentynineteen,
];
const data = years[Math.floor(Math.random() * years.length)];

const cleanData = data.map((datum) => {
  return [new Date(datum.date).getTime(), parseFloat(datum.value.toFixed(2))];
});

const TimeTheMarket = () => {
  const startingBalance = 100000;
  const [transactions, setTransactions] = useState<any>([]);

  const [cash, setCash] = useState(startingBalance);
  const [shares, setShares] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);

  const [ghostCash, setGhostCash] = useState(startingBalance);
  const [ghostShares, setGhostShares] = useState(0);
  const [ghostPortfolioValue, setGhostPortfolioValue] = useState(0);

  const [daysPassed, setDaysPassed] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(3);
  const [purchasedSharePrice, setPurchasedSharePrice] = useState(0);

  const [sharePrice, setSharePrice] = useState(cleanData[daysPassed][1]);
  const [inputData, setInputData] = useState([
    { label: "$ Amount", data: cleanData.slice(0, daysPassed + 1) },
  ]);

  const calculateGhostPortfolio = () => {
    const sharePrice = cleanData[daysPassed][1];
    const numberOfPurchasedShares = Math.floor(ghostCash / sharePrice);
    const transactionAmount = parseFloat(
      (numberOfPurchasedShares * sharePrice).toFixed(2)
    );
    const newBalance = parseFloat((ghostCash - transactionAmount).toFixed(2));

    setGhostShares(numberOfPurchasedShares);
    setGhostCash(newBalance);
  };

  useEffect(() => {
    calculateGhostPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const portfolioValue = cash + parseFloat((sharePrice * shares).toFixed(2));

    const ghostPortfolioValue =
      ghostCash + parseFloat((sharePrice * ghostShares).toFixed(2));

    setPortfolioValue(portfolioValue);
    setGhostPortfolioValue(ghostPortfolioValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharePrice]);

  useInterval(() => {
    if (daysPassed === cleanData.length - 1) {
      setIsGameOver(true);
    } else if (!isPaused) {
      // Trigger a new day. This means a new graph draw and new share price
      setSharePrice(cleanData[daysPassed + 1][1]);
      setInputData([
        {
          label: "$ Amount",
          data: cleanData.slice(0, daysPassed + 2), // We add an additional value here since the graph drawing is based off of a slice command
        },
      ]);
      setDaysPassed(daysPassed + 1);
    }
  }, 500 * gameSpeed);

  const series = useMemo(
    () => ({
      showPoints: true,
    }),
    []
  );

  const getSeriesStyle = React.useCallback((series) => {
    return {
      fill: "#28A96C",
      color: "#28A96C",
    };
  }, []);

  const axes = useMemo(
    () => [
      { primary: true, type: "time", position: "bottom" },
      { type: "linear", position: "left" },
    ],
    []
  );

  const purchaseShares = () => {
    if (sharePrice > cash) {
      return;
    }

    const numberOfPurchasedShares = Math.floor(cash / sharePrice);
    const transactionAmount = parseFloat(
      (numberOfPurchasedShares * sharePrice).toFixed(2)
    );
    const newBalance = parseFloat((cash - transactionAmount).toFixed(2));

    const transaction = {
      date: new Date(cleanData[daysPassed][0]),
      shareQuantity: numberOfPurchasedShares,
      pricePerShare: sharePrice,
      transactionAmount: transactionAmount,
      net: 0,
      currentPortfolioBalance: newBalance + transactionAmount,
      transactionType: "Bought",
    };

    setPurchasedSharePrice(sharePrice);
    setShares(numberOfPurchasedShares);
    setCash(newBalance);
    setTransactions([transaction, ...transactions]);
  };

  const sellShares = () => {
    if (shares === 0) {
      return;
    }

    const shareSellAmount = parseFloat((sharePrice * shares).toFixed(2));
    const newBalance = parseFloat((cash + shareSellAmount).toFixed(2));

    const transaction = {
      date: new Date(cleanData[daysPassed][0]),
      shareQuantity: shares,
      pricePerShare: sharePrice,
      net: (sharePrice - purchasedSharePrice) * shares,
      currentPortfolioBalance: newBalance,
      transactionType: "Sold",
    };

    setPurchasedSharePrice(0);
    setShares(0);
    setCash(newBalance);
    setTransactions([transaction, ...transactions]);
  };

  return (
    <>
      <Link className="p-4" href="/">
        Back to Home
      </Link>
      <div className="container mx-auto">
        <GameRules gameSpeed={gameSpeed} startingBalance={startingBalance} />

        <div className="container grid grid-cols-3">
          <div
            className="container col-span-2 border-r rounded border-gray-100"
            style={{
              height: "400px",
            }}
          >
            <Chart
              data={inputData}
              series={series}
              getSeriesStyle={getSeriesStyle}
              axes={axes}
              tooltip
            />
          </div>

          <div className="container mx-auto">
            <div className="container mx-auto pl-4">
              <GameSpeedControls
                gameSpeed={gameSpeed}
                setGameSpeed={setGameSpeed}
              />

              <div className="pt-8">
                <BuySellStartControls
                  cash={cash}
                  shares={shares}
                  sharePrice={sharePrice}
                  isPaused={isPaused}
                  purchaseShares={purchaseShares}
                  sellShares={sellShares}
                  setIsPaused={setIsPaused}
                />
              </div>

              <div className="pt-4">
                <span className="text-3xl font-semibold pr-4">
                  <NumberFormat
                    value={sharePrice}
                    style={{
                      color:
                        sharePrice >= purchasedSharePrice ? "green" : "red",
                    }}
                    decimalScale={2}
                    fixedDecimalScale
                    displayType={"text"}
                    thousandSeparator={true}
                    prefix={"$"}
                  />
                </span>
                <span className="">
                  <NumberFormat
                    value={(sharePrice - purchasedSharePrice) * shares}
                    style={{
                      color:
                        sharePrice >= purchasedSharePrice ? "green" : "red",
                    }}
                    allowNegative
                    decimalScale={2}
                    fixedDecimalScale
                    displayType={"text"}
                    thousandSeparator={true}
                    prefix={"$"}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container grid mx-auto grid-cols-2 space-x-4 py-4">
        <PortfolioDetails
          name="Ghost"
          cash={ghostCash}
          shares={ghostShares}
          portfolioValue={ghostPortfolioValue}
          startingBalance={startingBalance}
        />

        <PortfolioDetails
          name={"Player"}
          cash={cash}
          shares={shares}
          portfolioValue={portfolioValue}
          startingBalance={startingBalance}
        />
      </div>

      <div className="container mx-auto pb-8">
        <TransactionHistory
          startingBalance={startingBalance}
          transactions={transactions}
        />
      </div>

      {isGameOver && <span>Game over!</span>}
    </>
  );
};

export default TimeTheMarket;
