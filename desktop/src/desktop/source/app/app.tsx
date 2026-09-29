/**
 * Application start-up — counterpart of desktop/source/app/app.cxx
 * (Desktop::Main): registers UI components, then opens the Writer view.
 * Only Writer exists so far; Calc/Impress would be further modules beside sw.
 */
import { registerSvxToolBoxControllers } from "../../../svx/source/tbxctrls/tbcontrl";
import { SwView } from "../../../sw/source/uibase/uiview/view";
import "../../../vcl/source/app/vcl.css";
import "../../../svx/source/svx.css";

registerSvxToolBoxControllers();

export function App() {
  return <SwView />;
}
