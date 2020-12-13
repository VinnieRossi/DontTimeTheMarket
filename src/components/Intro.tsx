import { Link } from "@material-ui/core";
import React from "react";
import "tailwindcss/tailwind.css";

const Intro = (): JSX.Element => {
  return (
    <div className="">
      <div className="container mx-auto p-4">
        <h1 className="text-4xl pb-4 font-semibold">Don't time the market!</h1>
        <h2 className="text-2x1 pb-4">And other things to know</h2>
      </div>

      <div className="bg-gray-100">
        <div className="container grid grid-cols-2 grid-rows-2 mx-auto p-4">
          <div className="p-2">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sed
              est vel odio egestas rhoncus nec at nisi. Aenean feugiat elit nec
              bibendum facilisis. Sed vehicula fringilla varius. Praesent
              interdum pellentesque eros id ultrices. In hac habitasse platea
              dictumst. Phasellus rhoncus sagittis pretium. Maecenas tempus est
              nec sapien feugiat interdum. Nulla egestas nunc in sapien
              consectetur aliquet. Curabitur non neque ut felis faucibus
              efficitur non id ligula.
            </p>
          </div>
          <div className="p-2">
            <p>Put a picture here</p>
          </div>
          <div className="p-2">
            <p>Put a picture here</p>
          </div>
          <div className="p-2">
            <p>
              Integer et iaculis nulla, quis hendrerit ante. Nunc iaculis ipsum
              quis erat ullamcorper tristique. Nam eu magna at nunc porta
              aliquet eget eget magna. Nullam id ipsum ac tellus dapibus
              convallis vitae egestas lacus. Sed tincidunt luctus nisi sed
              varius. Morbi ac interdum magna. Quisque lobortis nulla ante, quis
              viverra dui dapibus nec. Vivamus nec lacinia sapien. Nullam
              sagittis velit sit amet eros mollis, sed eleifend enim molestie.
              Donec accumsan aliquet congue. Donec vulputate dolor nec risus
              tincidunt, vitae sagittis libero sollicitudin. Nam finibus arcu
              eget risus interdum auctor.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <div>
          <Link href="/play">Try your luck</Link>
        </div>
      </div>

      <div className="bg-gray-100">
        <div className="container mx-auto p-4">
          <p>Add footer?</p>
        </div>
      </div>

      {/* <div className="container mx-auto p-4">
        <div>
          <p>Words</p>
        </div>
      </div> */}
    </div>
  );
};

export default Intro;
