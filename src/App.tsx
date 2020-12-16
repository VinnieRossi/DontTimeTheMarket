import { Switch, Route, BrowserRouter as Router } from "react-router-dom";
import Intro from "./components/Intro";
import TimeTheMarket from "./components/TimeTheMarket";

const App = (): JSX.Element => {
  return (
    <>
      <Router>
        <main className="">
          <Switch>
            <Route path="/play" component={TimeTheMarket} />
            <Route path="/" component={Intro} />
          </Switch>
        </main>
      </Router>
    </>
  );
};

export default App;
