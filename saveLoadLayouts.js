import { allPieces, pieceIdCounter, createPiece, updateTransform, setPieceIdCounter, zoomToFit, resetView } from "./trackEditor.js";
import { getWorldPointsForSegment } from "./main.js"



const svg = document.getElementById('editor');

const saveDialog = document.getElementById("save_layout_dialog");
const loadDialog = document.getElementById("load_layout_dialog");

const saveLayoutBtn = document.getElementById("save");

const cancelSave = document.getElementById("cancel-save");
const cancelLoad = document.getElementById("cancel-load");


const saveBtn = document.getElementById("save-layout-btn");
const nameInput = document.getElementById("layout-name");
const list = document.getElementById("saved-layouts");

document.getElementById('load').addEventListener('click', openLoadLayoutDialog);

let currentLayoutName = "";

saveDialog.addEventListener("pointerdown", e => {
  const dialogDimensions = saveDialog.getBoundingClientRect();
  if ( e.clientX < dialogDimensions.left ||
       e.clientX > dialogDimensions.right ||
       e.clientY < dialogDimensions.top ||
       e.clientY > dialogDimensions.bottom
    ) {
      saveDialog.close();
    }
});

loadDialog.addEventListener("pointerdown", e => {
  const dialogDimensions = loadDialog.getBoundingClientRect();
  if ( e.clientX < dialogDimensions.left ||
       e.clientX > dialogDimensions.right ||
       e.clientY < dialogDimensions.top ||
       e.clientY > dialogDimensions.bottom
    ) {
      loadDialog.close();
    }
});


function getLayouts() {
  let layoutsList = {};
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('layout_')) {
      let layoutName = key.replace('layout_', '');
      let value = JSON.parse(localStorage.getItem(key));
      layoutsList[layoutName] = value;
    }
  });
  //console.log(layoutsList);
  return layoutsList;
}


function displayLayoutList() {
  list.innerHTML = "";
  const layouts = getLayouts();
  Object.keys(layouts).forEach(name => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${name}</span>
      <button class="delete-btn" data-name="${name}">🗑</button>
    `;
    list.appendChild(li);
  });
}

function openLoadLayoutDialog() {
  //console.log("Load Layout");
  displayLayoutList();
  loadDialog.showModal();
}

saveLayoutBtn.addEventListener("click", () => {
  nameInput.value = currentLayoutName;
  console.log("save layout");
  saveDialog.showModal();
  console.log(saveDialog);
});

cancelSave.addEventListener("click", () => {
  saveDialog.close();
});

cancelLoad.addEventListener("click", () => {
  loadDialog.close();
});


function saveLayout(name, allPieces, pieceIdCounter) {
  console.log("saving layout data now");

  const layoutData = allPieces.map(g => ({
    id: g.dataset.id,
    type: g.dataset.type,
    x: g.x || 0,
    y: g.y || 0,
    rotation: g.rotation || 0
  }));

  localStorage.setItem(`layout_${name}`, JSON.stringify(layoutData));
  localStorage.setItem(`layoutPieceCounter_${name}`, JSON.stringify(pieceIdCounter));
}

saveBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  saveLayout(name, allPieces, pieceIdCounter);
  currentLayoutName = name;
  saveDialog.close();
  showToast("Save Successful");
});


list.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const name = e.target.dataset.name;
    localStorage.removeItem(`layout_${name}`);
    localStorage.removeItem(`layoutPieceCounter_${name}`);
    displayLayoutList();
  } else {
    let clickTarget = e.target;
    let name = null;
    if (clickTarget.tagName !== "SPAN") {
      name = clickTarget.getElementsByTagName("SPAN")[0].innerText;  
    } else {
      name = clickTarget.innerText;
    }   
    //console.log("Load Layout: ", name)
    loadLayout(name);
    currentLayoutName = name;
    loadDialog.close();
  }
});


function loadLayout(name) {
  // Clear current pieces
  allPieces.forEach(p => p.remove());
  allPieces.length = 0;

  
  const data = JSON.parse(localStorage.getItem(`layout_${name}`));
  data.forEach(item => {
    const g = createPiece(item.type, 0, 0);
    g.dataset.id = item.id;
    g.x = item.x;
    g.y = item.y;
    g.rotation = item.rotation;
    updateTransform(g);
  });
  
  setPieceIdCounter(JSON.parse(localStorage.getItem(`layoutPieceCounter_${name}`)));
  //console.log(pieceIdCounter);

  resetView();
  
  const boundingBox = getAllPiecesBoundingBox(allPieces);
  console.log(boundingBox);
  
  zoomToFit(boundingBox, svg);
  
}

export function showToast(message) {
  const toast = document.getElementById('toast-message');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    // Optional: Hide completely after fade
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2000); // Show for 2 seconds
}


function getAllPiecesBoundingBox(pieces) {
  const boundingBox = {};
  boundingBox.maxX = -Infinity;
  boundingBox.minX = Infinity;
  boundingBox.maxY = -Infinity;
  boundingBox.minY = Infinity;
  
  for (const piece of pieces) {
    const elements = piece.querySelectorAll("line, path");
    for (const element of elements) {
      const { segmentPoints, segmentBoundingBox } = getWorldPointsForSegment(piece, element);
      if (segmentBoundingBox.maxX > boundingBox.maxX) { boundingBox.maxX = segmentBoundingBox.maxX};
      if (segmentBoundingBox.minX < boundingBox.minX) { boundingBox.minX = segmentBoundingBox.minX};
      if (segmentBoundingBox.maxY > boundingBox.maxY) { boundingBox.maxY = segmentBoundingBox.maxY};
      if (segmentBoundingBox.minY < boundingBox.minY) { boundingBox.minY = segmentBoundingBox.minY};
    }
  }

  return boundingBox;
}
