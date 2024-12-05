
import "./page.css"
import AttireWrapper from "./ui/attire/attire";
import { sampleAttire } from "./ui/sample_attire";


export default function Home() {

  return (
      <main className="">
        <div className="top-ribbon">
        <div>left-nav</div>
        <div>center-nav</div>
        <div>right-nav</div>
        </div>
        <AttireWrapper attire={sampleAttire}></AttireWrapper>
      </main>
  );
}
