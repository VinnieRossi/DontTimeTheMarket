import { Typography } from "@material-ui/core";
import React from "react";
import NumberFormat from "react-number-format";

interface PortfolioDetailsProps {
  name: string;
  cash: number;
  shares: number;
  portfolioValue: number;
  startingBalance: number;
}

const PortfolioDetails = ({
  name,
  cash,
  shares,
  portfolioValue,
  startingBalance,
}: PortfolioDetailsProps): JSX.Element => {
  return (
    <div className="container grid grid-cols-4 space-x-4">
      <div>
        <Typography>{name} Cash:</Typography>
        <NumberFormat
          value={cash}
          decimalScale={2}
          fixedDecimalScale
          displayType={"text"}
          thousandSeparator={true}
          prefix={"$"}
        />
      </div>

      <div>
        <Typography>{name} Shares: </Typography>
        <Typography>{shares}</Typography>
      </div>
      <div>
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
      </div>
      <div>
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
      </div>
    </div>
  );
};
export default PortfolioDetails;
