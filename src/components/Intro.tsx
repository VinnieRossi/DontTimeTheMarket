import "tailwindcss/tailwind.css";

const Intro = (): JSX.Element => {
  return (
    <div className="relative py-16 bg-white overflow-hidden">
      <div className="hidden lg:block lg:absolute lg:inset-y-0 lg:h-full lg:w-full">
        <div
          className="relative h-full text-lg max-w-prose mx-auto"
          aria-hidden="true"
        ></div>
      </div>
      <div className="relative px-4 sm:px-6 lg:px-8">
        <div className="text-lg max-w-prose mx-auto">
          <h1>
            <a
              href="/play"
              className="block text-base text-center text-indigo-600 font-semibold tracking-wide uppercase"
            >
              Skip the learning, play now
            </a>
            <span className="mt-2 block text-3xl text-center leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Don't time the market!
            </span>
          </h1>
          <p className="mt-8 text-xl text-gray-500 leading-8">
            For those who are familiar with online financial forums, it's
            something you've heard dozens of times. But how accurate is it?
          </p>
        </div>
        <div className="mt-6 prose prose-indigo prose-lg text-gray-500 mx-auto">
          <p>
            This piece of advice is generally paired with the quote{" "}
            <strong>"Time in the market beats timing the market"</strong>. The
            message is simple - You simply cannot beat the market by actively
            trading. You would be better off investing in some index that tracks
            the market and sitting on your hands.
          </p>
          <p>
            But how is that so? One could imagine that even a simple pattern of
            buying low and selling high should beat out doing absolutely
            nothing, right? Or what about if the market is crashing? An active
            investor could surely get out early and join back in only once the
            market has recovered.
          </p>
          <h2>The problem is you</h2>
          <p>
            So here's the problem. Even though the strategy seems
            straightforward, it's your emotions that would betray you. How long
            could you realistically sit on losses before you decide to "cut"
            them? Days? Weeks? Months? Doubtful. Most people don't have that
            patience, especially with something as important as their life
            savings. There's a special feeling when your $5,000 investment loses
            half of its value in a day that can't really be explained.
          </p>
          <blockquote>
            <p>
              Calling someone who trades actively in the market an investor is
              like calling someone who repeatedly engages in one-night stands a
              romantic.
            </p>
          </blockquote>
          - Warren Buffet
          <p>
            There's no shortage of quotes like this from Warren Buffet. But what
            does he know?
          </p>
          <h2>I've heard enough - Let me prove you wrong!</h2>
          <p>
            I've built a simulation that will allow you to actively trade and
            time the market! But...you have a competitor. Can a lazy investor
            who never makes a single trade really beat you? Only one way to find
            out.
          </p>
          <a
            href="/play"
            className="block text-base text-center text-indigo-600 font-semibold tracking-wide uppercase"
          >
            Let's lose some money!
          </a>
        </div>
      </div>
    </div>
  );
};

export default Intro;
