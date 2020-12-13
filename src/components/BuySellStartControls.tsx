import { Button } from "@material-ui/core";
import React from "react";

interface BuySellStartControlsProps {
  cash: number;
  shares: number;
  sharePrice: number;
  isPaused: boolean;
  purchaseShares: () => void;
  sellShares: () => void;
  setIsPaused: (isPaused: boolean) => void;
}

const BuySellStartControls = ({
  cash,
  shares,
  sharePrice,
  isPaused,
  purchaseShares,
  sellShares,
  setIsPaused,
}: BuySellStartControlsProps): JSX.Element => {
  return (
    <div className="container mx-auto">
      <div className="space-x-4">
        <Button
          variant="contained"
          color="primary"
          disabled={sharePrice > cash}
          style={{ background: "#28A96C" }}
          onClick={purchaseShares}
        >
          Buy
        </Button>

        <Button
          variant="contained"
          disabled={shares === 0}
          color="secondary"
          onClick={sellShares}
        >
          Sell
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setIsPaused(!isPaused);
          }}
        >
          {isPaused ? "Start" : "Pause"}
        </Button>
      </div>
    </div>
  );
};

export default BuySellStartControls;
