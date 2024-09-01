/*
** CONTACT FORM SUBMISSION
*/
const sendContact = async () => {
  const formData = new FormData(form);
  try {
    const response = await fetch(gRestUrl + "contact/"+gMetricWebsiteId, {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    
    const result = await response.json();
    const result_msg = form.querySelector(".result");
    
    if (result.success) {
      const formBtn = form.querySelector("button");
      formBtn.disabled = true;
      formBtn.style.cursor = "none";
      formBtn.textContent = "SENT";
      formBtn.style.backgroundColor = "green";
      result_msg.textContent = "Thank You!";
    }
    
  } catch (e) {
    console.error(e);
  }
}


const form = document.querySelector("form.contact");

form.querySelector("[name='url']").value = window.location.hostname; /* includes website in submission */

form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendContact();
});