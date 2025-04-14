/*
**  ADD / CHANGE / DELETE PAGES
*/
import { nav, dropdown_details } from "./deploy_elements.min.js";
import { callAPI, handleError } from "./deploy_callAPI.min.js";

const nav_items = nav.querySelector("div");
const editor = nav.nextElementSibling;

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    callAPI(endpoint,'GET')
        .then((data) => {
            editor.insertAdjacentHTML('afterbegin',data.html);
            dropdown_details.removeAttribute("open");
            editor.scrollIntoView();
            const edit = editor.querySelector("input[name='navigation_label']");
            const current = nav_items.querySelector("[aria-current='page']")
            edit.value = current.textContent;
            setCollectionType(current.dataset.collection);
            nav_items.querySelector(".visually-hidden")?.classList.remove("visually-hidden");
        })
        .catch((error) => {
            handleError(error);
        });
}

let tmp = 0;

const removeAriaCurrent = () => {
  nav.querySelectorAll("a").forEach( (a) => {
    a.removeAttribute("aria-current");
  })
}

const setCollectionType = (data) => {
    const collection = editor.querySelectorAll("[name='collection_type']");
    switch (data) {
        case "N/A":
            collection[0].checked = true;
            break;
        case "BLOG":
            collection[1].checked = true;
            break;
        case "PORTFOLIO":
            collection[2].checked = true;
            break;
    }
}

/*
** USER CLICKS A NAVIGATION LABEL WHICH WE USE TO CAPTURE ANY CHANGES (LABEL TEXT, COLLECTION_TYPE)
*/
nav_items.addEventListener("click", (e) => {
  e.preventDefault();
  removeAriaCurrent();
  e.target.setAttribute("aria-current","page");
  const edit = editor.querySelector("input[name='navigation_label']");
  edit.value = e.target.textContent;
  setCollectionType(e.target.dataset.collection);
})

/*
** REFLECT CHANGES IMMEDIATELY IN NAV ELEMENTS
*/
editor.addEventListener("input", (e) => {
    if (e.target.matches("[name='navigation_label']")) {
        nav.querySelector("[aria-current='page']").textContent = e.target.value;
    }

    if (e.target.matches("[name='collection_type']")) {
        nav.querySelector("[aria-current='page']").dataset.collection = e.target.value;
    }
})

/*
** BUTTON CLICK EVENT HANDLERS
*/
editor.addEventListener("click", async (e) => {
    if (e.target.matches(".add-page")) {
        const target = nav.querySelector("[aria-current='page']");
        removeAriaCurrent();
        const clone = target.cloneNode();
        clone.textContent = "[NEW PAGE]";
        clone.dataset.id = tmp--;
        clone.dataset.collection = "N/A";
        clone.setAttribute("aria-current","page");
        
        nav_items.insertBefore(clone, target.nextSibling);
        const edit = editor.querySelector("input[name='navigation_label']");
        edit.value = "[NEW PAGE]";
        return;
    }

    if (e.target.matches(".delete-page")) {
        if (nav_items.childElementCount === 1) {
            return;
        }
        const target = nav.querySelector("[aria-current='page']");
        if (target.nextElementSibling) {
            target.nextElementSibling.setAttribute("aria-current","page");
        } else {
            target.previousElementSibling.setAttribute("aria-current","page");
        }
        const edit = editor.querySelector("input[name='navigation_label']");
        edit.value = nav_items.querySelector("[aria-current='page']").textContent;
        target.remove();
        return;
    }

    if (e.target.matches(".cancel-changes")) {
        window.location.reload();
        return;
    }

    if (e.target.matches(".publish-changes")) {
        const arr = [];
        nav_items.querySelectorAll("a").forEach ((item) => {
            const obj = {};
            obj.article_id = item.dataset.id;
            obj.collection_type = item.dataset.collection;
            obj.navigation_label = item.textContent;
            arr.push(obj);
        })
        await callAPI(endpoint,'POST', arr)
            .then(() => {
                console.log("Form changes saved. Now deploy.");
            })
            .catch((error) => {
                handleError(error);
            });

        const import_module_name = "./deploy_publish-website.min.js";
        await import(import_module_name)
            .then((module) => {
                module.init(e.target);
            })
            .catch((error) => {
                handleError(error);
            });
    }
})