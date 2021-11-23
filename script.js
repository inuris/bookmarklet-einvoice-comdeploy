const configArisingDate = {
    name: "ArisingDate",
    id: "0",
    value: '1'
};

function configMail(comId, template) {
    var xhttp = new XMLHttpRequest();

    var requestUrl = "/Configs/Create/" + comId;
    xhttp.open("POST", requestUrl, true);
    xhttp.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded; charset=UTF-8"
    );
    let query =
        "customerId=" +
        comId +
        "&identification=" +
        template.id +
        "&key=" +
        template.name +
        "&value=" +
        encodeURIComponent(template.value);
    xhttp.send(query);
}
function getTaxCodeInPage(){
    try{
        let selector = document.querySelector('.panel-body table tr:nth-child(2) td:nth-child(3)');
        if (selector) {
            return selector.innerText;
        }
    }
    catch(e){}
    return "";
    
}
async function main() {    
    let askTaxcode = prompt("Paste yêu cầu Jira hoặc MST",  getTaxCodeInPage());
    if (askTaxcode) {
        creatOverlay();
        /* Lấy MST bằng REGEX */
        let taxCode = getTaxCodeFromString(askTaxcode);

        if (taxCode) {
            updateOverlayLog("Tìm công ty theo MST: [" + taxCode + "]...");
        }
        else {
            updateOverlayLog("<span style='color: #f00'>Không đọc được MST</span>", "Kết thúc", false);
            return false;
        }

        /* Lấy Thông tin công ty [Tên, ComId] */
        let comInfo = await getComInfo(taxCode);
        if (comInfo && comInfo.comId && comInfo.comName) {
            comInfo.taxCode = taxCode;
            updateOverlayLog("Tên công ty: " + comInfo.comName);
            updateOverlayLog("Mã công ty: [" + comInfo.comId + "]", "Chuẩn bị khởi tạo <a href='https://quantridichvu-hddt.vnpt-invoice.com.vn/Initialization/CustomersReal?keyword=" + comInfo.taxCode + "&areaId=0&sysType=0&statustype=34&initType=0' style='color: #d00; text-decoration: underline;'>[Click để hủy]</a>", false);
        }
        else {
            updateOverlayLog("<span style='color: #f00'>Không tìm thấy công ty</span>", "Kết thúc", false);
            return false;
        }
        await wait(5000);

        /* Kiểm tra hợp đồng */
        let contract = await checkContract(comInfo);
        if (contract) {
            updateOverlayLog("Đã có hợp đồng. Bắt đầu khởi tạo thật...", "Đang chạy");
        }
        else {
            updateOverlayLog("Không tìm thấy hợp đồng...");
            let qty = prompt("Nhập số lượng hóa đơn", 300);
            if (qty && qty > 0) {
                comInfo.qty = qty;
                updateOverlayLog("Bổ sung hợp đồng...");
                let responseContract = await addContract(comInfo);
                let dataContract = await responseContract.json();
                if (dataContract.success) {
                    updateOverlayLog("Hoàn tất bổ sung hợp đồng. Bắt đầu khởi tạo thật...", "Đang chạy");
                }
                else {
                    updateOverlayLog("<span style='color: #f00'>Không bổ sung được hợp đồng</span>", "Kết thúc", false);
                    return false;
                }
            }
            else {
                updateOverlayLog("<span style='color: #f00'>Nhập sai số lượng hóa đơn</span>", "Kết thúc", false);
                return false;
            }
        }
        await wait(2000);

        /* Khởi tạo thật */
        let responseDeploy = await requestDeploy(comInfo);
        if (responseDeploy) {
            updateOverlayLog("Hoàn tất Khởi tạo thật. Bắt đầu Tạo domain thật...");
        }
        else {
            updateOverlayLog("Lỗi khi Khởi tạo...", "Kết thúc", false);
            return false;
        }
        await wait(2000);

        /* Khởi tạo thật */
        let responseDomain = await requestDomain(comInfo);
        if (responseDomain) {
            updateOverlayLog("Hoàn tất Tạo domain thật");
            updateOverlayLog(
                '<a id="actionArisingDate" href="" style="color: #62b9ec; text-decoration: underline;">Lùi ngày</a>'
            );
            updateOverlayLog(
                "<a href='https://quantridichvu-hddt.vnpt-invoice.com.vn/Initialization/CustomersReal?keyword=" + comInfo.taxCode + "&areaId=0&sysType=0&statustype=34&initType=0' style='color: #35bb52; text-decoration: underline;'>Xem công ty</a>",
                "Kết thúc", false
            );
            let button = document.getElementById('actionArisingDate');
            button.addEventListener('click', (e) => {
                e.preventDefault();
                configMail(comInfo.comId, configArisingDate);
                alert("Hoàn thành");
            })
        }
        else {
            updateOverlayLog("Lỗi khi Tạo domain...", "Kết thúc", false);
            return false;
        }

        return true;
    }
}
async function checkContract(comInfo) {
    let urlDetail =
        "/Initialization/CustomerDetail/" +
        comInfo.comId;
    let responseDetail = await fetchCom(urlDetail);
    let dataDetail = await responseDetail.text();
    if (dataDetail.indexOf("Tên hợp đồng:") > 0 &&
        dataDetail.indexOf('title="Khởi tạo thật"') > 0) {
        return true;
    }
    return false;
}
async function requestDeploy(comInfo) {
    let urlDeploy =
        "/Initialization/Init/" +
        comInfo.comId;
    let urlInfo = "/Initialization/CustomerDetail/" + comInfo.comId;
    let responseDeploy = await fetchCom(urlDeploy);
    console.log("responseDeploy.status:" + responseDeploy.status);

    if (responseDeploy.status === 200) {
        let infoPage = await fetchCom(urlInfo);
        let dataDeploy = await infoPage.text();
        console.log("infoPage.status:" + infoPage.status);

        if (dataDeploy.indexOf("Tạo domain thật") > 0) {
            return true;
        }
    }
    return false;
}
async function requestDomain(comInfo) {
    let urlDomain =
        "/Initialization/InitDomain/" +
        comInfo.comId;
    let responseDomain = await fetchCom(urlDomain);
    console.log("responseDomain.status:", responseDomain.status);
    if (responseDomain.status === 200) {
        return true;
    }
    return false;
}

function getTaxCodeFromString(str) {
    try {
        /* https://3502427224-002-democadmin.vnpt-invoice.com.vn */
        str = str.replaceAll(" ", "");
        str = str.substring(str.indexOf('http'));
        let reg = /(\\\d{10}-\\\d{3})|(\\\d{10})/gm;
        /*  let reg = /https:\\\/\\\/([\\\d-]+)(?:demo)cadmin|(\\\d[\\\d-]*)/g; */
        let regMatch = reg.exec(str);
        let result = regMatch[1] || regMatch[2];
        /*if (result && result[result.length - 1] === "-") {
            result = result.substring(0, result.length - 1);
        }*/
        if (result != "") return result;
    } catch (e) {
        return "";
    }
}
async function getComInfo(mst) {

    try {
        let url =
            "/Initialization/CustomersTest?keyword=" +
            mst +
            "&areaId=0&sysType=0&statustype=12";
        /* Tạo boundary khi upload dạng Form */
        var sBoundary = "---------------------------" + Date.now().toString(16);
        let header = {
            "content-type":
                "application/x-www-form-urlencoded; charset=UTF-8; boundary=" + sBoundary,
            accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "content-encoding": "gzip"
        };
        let response = await fetch(url, {
            header: header,
            method: "GET"
        });
        let data = await response.text();
        let regex = /"\\\/Initialization\\\/CustomerEdit\\\/(\\\S+)"/g;
        let comId = regex.exec(data)[1];
        let regex2 = /title="Thay đổi">(.+?)<\\\/a>/g;
        let comName = htmlDecode(regex2.exec(data)[1]);
        return {
            comId: comId,
            comName: comName
        };
    }
    catch (e) {
        console.log(e);
        return null;
    }
}
async function addContract(comInfo) {
    let today = new Date().toLocaleDateString('en-gb');
    const contract = {
        Taxcode: comInfo.taxCode,
        Identification: comInfo.comId,
        "lstContract[0]._ContractName": comInfo.comName,
        "lstContract[0].No": "",
        "lstContract[0].Quantity": comInfo.qty,
        "lstContract[0].ContractDate": today,
        "lstContract[0].ContractType": "989d79d3-e93e-4b3d-94ac-a93500ae1890"
    };
    const url = "/Initialization/AddContract";
    /* Tạo boundary khi upload dạng Form */
    var sBoundary = "---------------------------" + Date.now().toString(16);
    let header = {
        "content-type":
            "application/x-www-form-urlencoded; charset=UTF-8; boundary=" + sBoundary,
        accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "content-encoding": "gzip"
    };

    let form_data = objectToFormData(contract);
    let response = await fetch(url, {
        header: header,
        body: form_data,
        method: "POST"
    });
    return response;
}

async function fetchCom(url) {
    let header = {
        "content-type":
            "application/x-www-form-urlencoded; charset=UTF-8; boundary=---------------------------" + Date.now().toString(16),
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "content-encoding": "gzip"
    };
    try {
        let response = await fetch(url, {
            header: header,
            method: "GET"
        });
        if (response.status === 200) {
            return response;
        }
    }
    catch (e) {
        console.log(e);
    }
    return null;
}

/* convert JSON object to  FormData */
function objectToFormData(obj, rootName, ignoreList) {
    var formData = new FormData();
    function appendFormData(data, root) {
        if (!ignore(root)) {
            root = root || "";
            if (data instanceof File) {
                formData.append(root, data);
            } else if (Array.isArray(data)) {
                for (let data_i = 0; data_i < data.length; data_i++) {
                    appendFormData(data[data_i], root + "[" + data_i + "]");
                }
            } else if (typeof data === "object" && data) {
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        if (root === "") {
                            appendFormData(data[key], key);
                        } else {
                            appendFormData(data[key], root + "." + key);
                        }
                    }
                }
            } else {
                if (data !== null && typeof data !== "undefined") {
                    formData.append(root, data);
                }
            }
        }
    }
    function ignore(root) {
        return (
            Array.isArray(ignoreList) &&
            ignoreList.some(function (x) {
                return x === root;
            })
        );
    }
    appendFormData(obj, rootName);
    return formData;
}
function htmlDecode(input) {
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
}
let wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function newElement(tag, isBlock, { ...attArray }) {
    let newElement = document.createElement(tag);
    let style = Object.keys(attArray);
    for (let i = 0; i < style.length; i++) {
        newElement[style[i]] = attArray[style[i]];
    }
    /* Wrap in new div if isBlock = true */
    if (isBlock) {
        let newBlock = document.createElement("div");
        newBlock.appendChild(newElement);
        return newBlock;
    }
    return newElement;
}
function creatOverlay() {
    /* CSS for popup classes */
    let style = newElement("style", false, {
        innerHTML:
            "#_ext_overlay { height: 100%; width: 100%; position: fixed; z-index: 9999; left: 0; top: 0; background-color: rgba(0,0,0, 0.5); overflow-x: hidden;}" +
            "#_ext_overlay_content { position: relative;  top: 10%; width: 100%; text-align: center; margin-top: 30px;}" +
            "#_ext_overlay_content p{ padding: 8px; text-decoration: none; font-size: 36px; color: #fff; display: block;}" +
            "#_ext_overlay_content p.loading:after{ content: ' .'; animation: dots 1s steps(5, end) infinite;}" +
            "@keyframes dots {" +
            "0%, 20% {color: rgba(0,0,0,0);text-shadow: .25em 0 0 rgba(0,0,0,0),  .5em 0 0 rgba(0,0,0,0);}" +
            "40% {color: white; text-shadow:.25em 0 0 rgba(0,0,0,0),   .5em 0 0 rgba(0,0,0,0);}" +
            "60% {text-shadow: .25em 0 0 white, .5em 0 0 rgba(0,0,0,0);}" +
            "80%, 100% {text-shadow: .25em 0 0 white, .5em 0 0 white;}}",
        type: "text/css"
    });
    let overlay = newElement("div", false, {
        id: "_ext_overlay"
    });
    overlay.appendChild(style);
    let overlay_content = newElement("div", false, {
        id: "_ext_overlay_content",
        innerHTML:
            '<p class="loading" id="_ext_overlay_loading">Đang chạy</p><p id="_ext_overlay_log"></p>'
    });
    overlay.appendChild(overlay_content);
    document.body.appendChild(overlay);
}
function updateOverlayLog(text, status, running = true) {
    document.getElementById("_ext_overlay_log").innerHTML += "<br />" + text;
    if (status) {
        let loading = document.getElementById("_ext_overlay_loading");
        if (!running) {
            loading.classList.remove("loading");
        }
        else {
            loading.classList.add("loading");
        }
        loading.innerHTML = status;
    }
}

if (document.URL.indexOf("quantridichvu-hddt.vnpt-invoice.com.vn") > 0) {
    main();
} else if (document.URL.indexOf("cdpn.io") < 0 && document.URL.indexOf("vscode") < 0) {
    window.open(
        "https://quantridichvu-hddt.vnpt-invoice.com.vn/Initialization/CustomersTest?keyword=&areaId=0&sysType=0&statustype=12"
    );
}
