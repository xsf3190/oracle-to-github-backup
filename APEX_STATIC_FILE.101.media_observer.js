/*
**  BATCH PERFORMANCE ENTRIES IN ARRAY TO AVOID TOO MANY DATABASE PROCESS CALLS
*/
const perfObserver = (list) => {
    list.getEntries().forEach((entry) => {
        /* 
        ** Process network media transfers - ignore cache
        ** Safari does not publish transferSize so we handle that in the HEAD fetch
        ** Transfers <=300 are treated as cache transfers
        ** HEAD fetch retrieves content-type for all browsers as this is reported inaccurately for Cloudinary asset downloads
        */ 
 
        if (["img","video","audio"].indexOf(entry.initiatorType)===-1) return;

        if (entry.transferSize > 0 || gBrowser.startsWith("Safari")) {
            const duration = Math.round(entry.duration * 1) / 1;
            
            const parts = entry.name.split("/");
            let public_id = parts.pop();
            const resource_type = parts[4] === "video" ? 'video' : "image";

            const filetype = public_id.substring(public_id.lastIndexOf(".")+1);
            if (['png','jpg','webm','mp4','aac','ogg','mp3','wav'].indexOf(filetype)>=0) {
                public_id = public_id.substring(0,public_id.lastIndexOf("."));
            }

            // Get the media content-type with HEAD fetch. Wish I knew how Developer Tools do it.
            fetch(entry.name,{method:'HEAD', headers: {Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,video/webm,video/mp4,audio/aac,audio/ogg,audio/mp3,audio/wav",}})
                .then(response => {
                    const contentType = response.headers.get('Content-Type');
                    let transferSize = entry.transferSize;
                    if (gBrowser.startsWith("Safari")) {
                        transferSize = response.headers.get('Content-Length');
                    }
                    //gPerfObj.images.push(
                    mediaQueue.add(
                        {"session_id": apex_session, "cld_cloud_name": parts[3], "resource_type": resource_type, "public_id": public_id, "epoch": Math.round(Date.now()/1000),
                        "url": entry.name, "transfersize": transferSize, "duration": duration, "content_type":contentType,
                        "window_innerwidth": window.innerWidth, "browser":gBrowser, "servertiming": entry.serverTiming}
                    );
                })
                .catch(error => {
                    console.error('Error fetching media content-type:', error);
                    popupOpen('Error fetching media content-type:', error);
                });
        };
        
    });
}