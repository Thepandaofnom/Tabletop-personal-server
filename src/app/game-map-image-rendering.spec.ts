import { GameMapComponent } from '@tabletop/ui-components';
import Konva from 'konva';

interface GameMapInternals {
  stage?: Konva.Stage;
  layer?: Konva.Layer;
  gridLayer?: Konva.Layer;
  tokenLayer?: Konva.Layer;
  mapImage?: Konva.Image;
  tokens: Map<string, Konva.Group>;
  tokenImages: Map<string, Konva.Image>;
  addImageToLayer(image: HTMLImageElement): void;
  onTokenImageSelected(event: Event, tokenId: string): void;
}

interface MapScene {
  component: GameMapComponent;
  internals: GameMapInternals;
  host: HTMLDivElement;
  stage: Konva.Stage;
  mapLayer: Konva.Layer;
  gridLayer: Konva.Layer;
  tokenLayer: Konva.Layer;
}

describe('GameMapComponent image rendering', () => {
  let scene: MapScene;

  beforeEach(() => {
    scene = createMapScene();
  });

  afterEach(() => {
    scene.stage.destroy();
    scene.host.remove();
  });

  it('attaches an uploaded map image to the bottom map layer and paints it', async () => {
    const image = await createImage('#d72638', 120, 80);

    scene.internals.addImageToLayer(image);

    const mapImage = scene.internals.mapImage;
    expect(mapImage).toBeDefined();
    expect(mapImage?.getParent()).toBe(scene.mapLayer);
    expect(scene.stage.getChildren()).toEqual([scene.mapLayer, scene.gridLayer, scene.tokenLayer]);
    expect(readPixel(scene.stage.toCanvas(), 30, 30)).toEqual([215, 38, 56, 255]);
  });

  it('attaches an assigned token image to its token group on the top token layer and paints it', async () => {
    const tokenImageFile = await createImageFile('#39ff14', 80, 80);
    scene.component.tokenName = 'Visible token';
    scene.component.addToken();

    const tokenId = [...scene.internals.tokens.keys()][0];
    expect(tokenId).toBeDefined();

    scene.internals.onTokenImageSelected(
      { target: { files: [tokenImageFile] } } as unknown as Event,
      tokenId,
    );
    await waitFor(() => scene.internals.tokenImages.has(tokenId));

    const tokenGroup = scene.internals.tokens.get(tokenId);
    const tokenImage = scene.internals.tokenImages.get(tokenId);
    expect(tokenImage?.getParent()).toBe(tokenGroup);
    expect(tokenGroup?.getParent()).toBe(scene.tokenLayer);
    expect(scene.stage.getChildren()).toEqual([scene.mapLayer, scene.gridLayer, scene.tokenLayer]);
    expect(readPixel(scene.stage.toCanvas(), 95, 75)).toEqual([57, 255, 20, 255]);
  });
});

function createMapScene(): MapScene {
  const component = new GameMapComponent();
  const host = document.createElement('div');
  document.body.append(host);

  const stage = new Konva.Stage({ container: host, width: 160, height: 120 });
  const mapLayer = new Konva.Layer();
  const gridLayer = new Konva.Layer();
  const tokenLayer = new Konva.Layer();
  stage.add(mapLayer, gridLayer, tokenLayer);

  const internals = component as unknown as GameMapInternals;
  internals.stage = stage;
  internals.layer = mapLayer;
  internals.gridLayer = gridLayer;
  internals.tokenLayer = tokenLayer;

  return { component, internals, host, stage, mapLayer, gridLayer, tokenLayer };
}

async function createImage(color: string, width: number, height: number): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create the image test canvas.');
  }

  context.fillStyle = color;
  context.fillRect(0, 0, width, height);

  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to load the generated test image.'));
  });
  image.src = canvas.toDataURL('image/png');
  await loaded;
  return image;
}

async function createImageFile(color: string, width: number, height: number): Promise<File> {
  const image = await createImage(color, width, height);
  const response = await fetch(image.src);
  return new File([await response.blob()], 'token-image.png', { type: 'image/png' });
}

async function waitFor(condition: () => boolean): Promise<void> {
  const timeoutAt = performance.now() + 1_000;
  while (!condition()) {
    if (performance.now() >= timeoutAt) {
      throw new Error('Timed out waiting for the token image to load.');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function readPixel(canvas: HTMLCanvasElement, x: number, y: number): [number, number, number, number] {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to inspect the rendered canvas.');
  }
  return [...context.getImageData(x, y, 1, 1).data] as [number, number, number, number];
}
