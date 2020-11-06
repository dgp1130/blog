import {
  addDecorator,
  addParameters,
  setCustomElements,
  withKnobs,
  withWebComponentsKnobs
} from '@open-wc/demoing-storybook';

addDecorator(withKnobs);
addDecorator(withWebComponentsKnobs);

async function run() {
  const customElements = await (
    await fetch(new URL('../custom-elements.json', import.meta.url))
  ).json();

  setCustomElements(customElements);
}

run();
