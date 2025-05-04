# GeoForm UI

Mobile friendly WebApp for geospatial surveying with offline first support

## Prerequisites

1. NodeJS >= 20
2. [PNPM](https://pnpm.io/id/) >= 9.15 . _Recommended_ to use [corepack](https://github.com/nodejs/corepack)
3. [GeoForm Backend](https://github.com/Barrakusuma-Spatial-Teknologi/geoform-backend)
4. [Semver](https://semver.org/lang/id/) understanding for release a new version

### Config file

1. Create `.env` file
2. Fill the `NUXT_PUBLIC_API_URL` variable with url to geoform backend e.g.

```dotenv
NUXT_PUBLIC_API_URL=https://localhost:3000/api
```

## Usage

Most application usage can be done using `pnpm`

### Running in dev

```bash
pnpm dev
```

### Building for release

1. If release is a new version then make sure to update the `constants/version.ts` file, follow the pattern of semver
2. `pnpm build`
3. Copy the file to the server

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.
