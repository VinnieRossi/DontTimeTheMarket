import {
  Button,
  Card,
  CardHeader,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@material-ui/core";
import React, { useEffect, useMemo, useState } from "react";
import { Chart } from "react-charts";
import NumberFormat from "react-number-format";
import useInterval from "use-interval";

interface LineGraphProps {
  data: {
    date: string;
    value: number;
  }[];
}

const LineGraph = ({ data }: LineGraphProps) => {
  const cleanData = data.map((datum) => {
    return [new Date(datum.date).getTime(), parseFloat(datum.value.toFixed(2))];
  });

  const startingBalance = 1000000;
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
    const sharePrice = cleanData[daysPassed][1];

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
      currentPortfolioBalance: newBalance + transactionAmount,
      transactionType: "bought",
    };

    setShares(numberOfPurchasedShares);
    setCash(newBalance);
    setTransactions([...transactions, transaction]);
  };

  const sellShares = () => {
    if (shares === 0) {
      return;
    }

    const sharePrice = cleanData[daysPassed][1];
    const shareSellAmount = parseFloat((sharePrice * shares).toFixed(2));
    const newBalance = parseFloat((cash + shareSellAmount).toFixed(2));

    const transaction = {
      date: new Date(cleanData[daysPassed][0]),
      shareQuantity: shares,
      pricePerShare: sharePrice,
      currentPortfolioBalance: newBalance,
      transactionType: "sold",
    };

    setShares(0);
    setCash(newBalance);
    setTransactions([...transactions, transaction]);
  };

  const generateTransactionLineItem = (transaction: any): any => {
    const string = `${transaction.date.toLocaleDateString()}: ${
      transaction.shareQuantity
    } shares ${transaction.transactionType} at `;

    return (
      <>
        <Typography style={{ display: "inline" }}>{string}</Typography>
        <NumberFormat
          value={transaction.pricePerShare}
          decimalScale={2}
          fixedDecimalScale
          displayType={"text"}
          thousandSeparator={true}
          prefix={"$"}
        />
        <Typography style={{ display: "inline" }}>. New balance: </Typography>
        <NumberFormat
          value={transaction.currentPortfolioBalance}
          style={{
            color:
              transaction.currentPortfolioBalance >= startingBalance
                ? "green"
                : "red",
          }}
          decimalScale={2}
          fixedDecimalScale
          displayType={"text"}
          thousandSeparator={true}
          prefix={"$"}
        />
      </>
    );
  };

  return (
    <>
      <div
        style={{
          width: "1200px",
          height: "300px",
        }}
      >
        <Chart
          data={inputData}
          series={series}
          getSeriesStyle={getSeriesStyle}
          axes={axes}
          tooltip
        />
        <Grid container justify="center">
          <Grid item container justify="center" spacing={3}>
            <Grid item container justify="flex-start">
              <Grid item>
                <Button
                  onClick={() => {
                    setGameSpeed(3);
                    setDaysPassed(0);
                    setTransactions([]);

                    setCash(startingBalance);
                    setShares(0);
                    setPortfolioValue(startingBalance);

                    setGhostCash(startingBalance);
                    setGhostShares(0);
                    setGhostPortfolioValue(startingBalance);
                    setSharePrice(cleanData[0][1]);

                    setIsGameOver(false);
                    setIsPaused(true);
                    // This cannot properly reset since it's setting the cash internally
                    // Fix this later when I want to allow replayability
                    // calculateGhostPortfolio();
                  }}
                >
                  Restart
                </Button>
              </Grid>
              <Grid item>
                <Button
                  disabled={gameSpeed === 10}
                  onClick={() => {
                    setGameSpeed(Math.min(gameSpeed + 1, 10));
                  }}
                >
                  Slow down
                </Button>
              </Grid>
              <Grid item>
                <Button
                  disabled={gameSpeed === 1}
                  onClick={() => {
                    setGameSpeed(Math.max(gameSpeed - 1, 1));
                  }}
                >
                  Speed up
                </Button>
              </Grid>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                style={{ background: "#28A96C" }}
                onClick={purchaseShares}
              >
                Buy
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="secondary"
                onClick={sellShares}
              >
                Sell
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setIsPaused(!isPaused);
                }}
              >
                {isPaused ? "Resume" : "Pause"}
              </Button>
            </Grid>
          </Grid>

          <Grid item>
            <h2>
              <NumberFormat
                value={sharePrice}
                decimalScale={2}
                fixedDecimalScale
                displayType={"text"}
                thousandSeparator={true}
                prefix={"$"}
              />
            </h2>
          </Grid>

          <Grid item container justify="center" spacing={2}>
            <Grid item container justify="center" spacing={3}>
              <Grid item>
                <Typography>Balance:</Typography>
                <NumberFormat
                  value={cash}
                  decimalScale={2}
                  fixedDecimalScale
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"$"}
                />
              </Grid>
              <Grid item>
                <Typography>Shares: </Typography>
                <Typography>{shares}</Typography>
              </Grid>
              <Grid item>
                <Typography>Portfolio Value: </Typography>
                <NumberFormat
                  style={{
                    color: portfolioValue >= startingBalance ? "green" : "red",
                  }}
                  value={portfolioValue}
                  decimalScale={2}
                  fixedDecimalScale
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"$"}
                />
              </Grid>
              <Grid item>
                <Typography>Rate of Return</Typography>
                <Typography
                  style={{
                    color: portfolioValue >= startingBalance ? "green" : "red",
                  }}
                >
                  {parseFloat(
                    (
                      ((portfolioValue - startingBalance) / startingBalance) *
                      100
                    ).toFixed(2)
                  )}
                  %
                </Typography>
              </Grid>
            </Grid>

            <Grid item container justify="center" spacing={3}>
              <Grid item>
                <Typography>Ghost Balance:</Typography>
                <NumberFormat
                  value={ghostCash}
                  decimalScale={2}
                  fixedDecimalScale
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"$"}
                />
              </Grid>
              <Grid item>
                <Typography>Ghost Shares: </Typography>
                <Typography>{ghostShares}</Typography>
              </Grid>
              <Grid item>
                <Typography>Ghost Portfolio Value: </Typography>
                <NumberFormat
                  style={{
                    color:
                      ghostPortfolioValue >= startingBalance ? "green" : "red",
                  }}
                  value={ghostPortfolioValue}
                  decimalScale={2}
                  fixedDecimalScale
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"$"}
                />
              </Grid>
              <Grid item>
                <Typography>Rate of Return</Typography>
                <Typography
                  style={{
                    color:
                      ghostPortfolioValue >= startingBalance ? "green" : "red",
                  }}
                >
                  {parseFloat(
                    (
                      ((ghostPortfolioValue - startingBalance) /
                        startingBalance) *
                      100
                    ).toFixed(2)
                  )}
                  %
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid container justify="flex-end">
            <Card
              style={{
                minWidth: 275,
                minHeight: 215,
                maxHeight: 300,
                overflow: "auto",
                padding: 15,
              }}
            >
              <CardHeader title="Transaction History" />
              <List>
                {transactions.map((transaction, index) => (
                  <ListItem
                    key={index}
                    style={{ paddingBottom: 0, paddingTop: 0 }}
                  >
                    <ListItemText>
                      {generateTransactionLineItem(transaction)}
                    </ListItemText>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>
        </Grid>
      </div>

      {isGameOver && <span>game over</span>}
    </>
  );
};

export default LineGraph;
