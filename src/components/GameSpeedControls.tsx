import { Button } from "@material-ui/core";
import React from "react";

interface GameSpeedControlsProps {
  gameSpeed: number;
  setGameSpeed: (newSpeed: number) => void;
}

const GameSpeedControls = ({
  gameSpeed,
  setGameSpeed,
}: GameSpeedControlsProps): JSX.Element => {
  return (
    <div className="container">
      <div className="container flex">
        <span className="mx-auto text-sm text-gray-400">
          {parseFloat((3 / gameSpeed).toFixed(2)) * 100}%
        </span>
      </div>
      <div>
        <Button
          disabled={gameSpeed === 10}
          onClick={() => {
            setGameSpeed(Math.min(gameSpeed + 1, 10));
          }}
        >
          Slow down
        </Button>
        <Button
          disabled={gameSpeed === 1}
          onClick={() => {
            setGameSpeed(Math.max(gameSpeed - 1, 1));
          }}
        >
          Speed up
        </Button>
      </div>
    </div>
  );
};

export default GameSpeedControls;
