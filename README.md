`npm i`

create a self-signed https certificate ([source](https://stackoverflow.com/a/35231213)):

`openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem`

`npm dev`

go to https://localhost:5174

You will need a json at `public/handData/handData1.json` of the following form to make fake or inline users work:


```
[
    {
        "left": {
            "wrist": {
                "transformMatrix": THREE.Matrix4().elements,
                "radius": Number
            },
            ...other joint names
        },
        "right": {
            ...same as left, for right hand
        }
    },
    { ...next frame with left & right }
]
```
