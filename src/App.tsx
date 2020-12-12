import { Switch, Route, BrowserRouter as Router } from "react-router-dom";
import "./App.css";
import Landing from "./components/Landing";

const App = (): JSX.Element => {
  return (
    <>
      <Router>
        <main>
          <Switch>
            <Route path="/" component={Landing} />
          </Switch>
        </main>
      </Router>
    </>
  );
};

export default App;
