<div align="center"> 

# Sensor Temporal Sync Bridge Configurator
</div>
emnavi sensor_bridge 板卡的上位机, 实现一下功能

- 固件更新
- 执行传感器校准(数据存在stm32上)
- 板卡状态查看
- 常用功能配置



## Getting started

```bash
git clone git@github.com:hyaline-wang/emnaviDiscoverElectron.git
```

### Install dependencies ⏬

```bash
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### Start developing ⚒️


```bash
npm run dev
```





## Additional Commands

```bash
npm run dev # starts application with hot reload


npm run build # builds application, distributable files can be found in "dist" folder

# OR

npm run build:win # uses windows as build target
npm run build:mac # uses mac as build target
npm run build:linux # uses linux as build target
```

Optional configuration options can be found in the [Electron Builder CLI docs](https://www.electron.build/cli.html).
## Project Structure

```bash
- scripts/ # all the scripts used to build or serve your application, change as you like.
- src/
  - main/ # Main thread (Electron application source)
  - renderer/ # Renderer thread (VueJS application source)
```

## Using static files

If you have any files that you want to copy over to the app directory after installation, you will need to add those files in your `src/main/static` directory.

Files in said directory are only accessible to the `main` process, similar to `src/renderer/assets` only being accessible to the `renderer` process. Besides that, the concept is the same as to what you're used to in your other front-end projects.

#### Referencing static files from your main process

```ts
/* Assumes src/main/static/myFile.txt exists */

import {app} from 'electron';
import {join} from 'path';
import {readFileSync} from 'fs';

const path = join(app.getAppPath(), 'static', 'myFile.txt');
const buffer = readFileSync(path);
```
