
/* 
 ** CREATE CLOUDINARY UPLOAD WIDGET
 */
var widget=cloudinary.createUploadWidget(
    { 
        cloudName: 'mrbapex',
        uploadPreset: 'npxwdk7x',
    },
    (error, result) => {
        if (!error && result && result.event === "success") { 
            console.log('Done! Here is the image info: ', result.info); 
        }
    }
);