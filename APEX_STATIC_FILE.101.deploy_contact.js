const sendContact = async () => {
  const formData = new FormData(form);
  try {
    const response = await fetch(gRestUrl + "contact/"+gMetricWebsiteId, {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    const result = await response.json();

    const formBtn = form.querySelector("button");
    formBtn.disabled = true;
    formBtn.style.cursor = "none";
    formBtn.querySelector(".edge").remove();
    formBtn.querySelector(".shadow").remove();
    
    const front = formBtn.querySelector(".front");
    form.querySelector(".result").style.opacity = "1";
      
    if (result.success) {
        front.textContent = "Sent";
        front.style.background = "green";
    } else {
        front.textContent = "Failed - copy emaail address and send manually";
    }
    
  } catch (e) {
    console.error(e);
  }
}

/*
** CONTACT FORM SUBMISSION
*/
const form = document.querySelector("div.contact > form"),
      copy_content = form.querySelector(".copy-content");

form.querySelector("[name='url']").value = window.location.hostname; /* includes website in submission */

form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendContact();
});
                      
/*
** COPY TEXT CONTENT OF BUTTON TO CLIPBOARD WHEN CLICKED 
*/
copy_content.addEventListener("click", async () => {
    const text = copy_content.innerText;
    const result = copy_content.querySelector("span");
    try {
        await navigator.clipboard.writeText(text);
        result.textContent = "Copied";
        result.style.opacity = "1";
    } catch (error) {
        result.textContent = error.message;
    }
});