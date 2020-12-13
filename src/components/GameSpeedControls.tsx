import { Grid, Button } from "@material-ui/core";
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
    <Grid item container justify="flex-start">
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
  );
};

export default GameSpeedControls;
