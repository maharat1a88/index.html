javascript:(function(){

if(window.__DEVTOOL){
  document.getElementById('dt_box')?.remove();
  document.getElementById('__freeze_layer')?.remove();
  delete window.__DEVTOOL;
  return;
}
window.__DEVTOOL = 1;

// ===== STATE =====
let frozen=false, scrollY=0, blocker=null, inspectMode=false;
let visibleOnly=true;
let history=[];

// ===== HELPERS =====
function isVisible(el){
  if(!visibleOnly) return true;
  const s = getComputedStyle(el);
  return !(s.display==='none'||el.offsetParent===null);
}

function ensureDigitStyle(){
  if(document.getElementById('dt-digit-style')) return;

  const style = document.createElement('style');
  style.id = 'dt-digit-style';
  style.textContent = `.dt-digit{color:black !important;font-weight:bold;}`;
  document.head.appendChild(style);
}

function colorizeDigits(root=document.body){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while(walker.nextNode()){
    const node = walker.currentNode;

    if(node.parentElement?.closest('[data-devtool], .dt-digit')) continue;

    const text = node.nodeValue;
    if(!/[0-9]/.test(text)) continue;

    const replaced = text.replace(/(\$?\d[\d,]*(\.\d+)?)/g,
      m=>`<span class="dt-digit">${m}</span>`);

    if(replaced !== text){
      const span = document.createElement('span');
      span.innerHTML = replaced;
      node.replaceWith(span);
    }
  }
}

// ===== GLOBAL INIT =====
function init(){
  ensureDigitStyle();
  colorizeDigits(document.body);

  const observer = new MutationObserver(muts=>{
    muts.forEach(m=>{
      m.addedNodes.forEach(n=>{
        if(n.nodeType===1) colorizeDigits(n);
      });
    });
  });

  observer.observe(document.body,{childList:true,subtree:true});
}

// ===== START =====
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', init);
}else{
  init();
}

// ===== UI =====
const box = document.createElement('div');
box.id='dt_box';
box.setAttribute('data-devtool','true');

Object.assign(box.style,{
  position:'fixed',
  top:'10px',
  left:'10px',
  background:'#111',
  color:'#fff',
  zIndex:'2147483647',
  padding:'10px',
  borderRadius:'10px',
  fontFamily:'sans-serif'
});

box.innerHTML = `
<b>DEV TOOL</b><br><br>
<button id=fz>Freeze</button>
<button id=ins>Inspect</button>
<button id=css>CSS</button>
<button id=inputs>Input</button>
<button id=digits>Digits</button>
<button id=livehtml>Live HTML</button>
<button id=sr>Search/Replace</button>
<button id=undo>Undo</button><br><br>
<label><input type=checkbox id=vis checked> Visible Only</label><br><br>
<button id=x>Close</button>
`;

document.body.appendChild(box);

// ===== BUTTONS =====

// digits
box.querySelector('#digits').onclick = () => colorizeDigits();

// visible toggle
box.querySelector('#vis').onchange = e => visibleOnly = e.target.checked;

// freeze
box.querySelector('#fz').onclick = ()=>{
  frozen=!frozen;

  if(frozen){
    box.querySelector('#fz').textContent='Resume';
    scrollY=window.scrollY;

    document.body.style.position='fixed';
    document.body.style.top='-'+scrollY+'px';

    blocker=document.createElement('div');
    blocker.id='__freeze_layer';
    Object.assign(blocker.style,{
      position:'fixed',
      top:0,left:0,width:'100%',height:'100%',
      background:'rgba(0,0,0,0.4)',
      zIndex:'2147483646'
    });
    document.body.appendChild(blocker);

  }else{
    box.querySelector('#fz').textContent='Freeze';
    document.body.style.position='';
    document.body.style.top='';
    window.scrollTo(0,scrollY);
    blocker?.remove();
  }
};

// inspect modes
box.querySelector('#ins').onclick=()=>{
  inspectMode='text';
  alert('Click element to edit text');
};

box.querySelector('#css').onclick=()=>{
  inspectMode='css';
  alert('Click element to edit CSS');
};

box.querySelector('#inputs').onclick=()=>{
  inspectMode='input';
  alert('Click input to edit value');
};

// click edit
document.addEventListener('click',e=>{
  if(!inspectMode) return;

  e.preventDefault();
  e.stopPropagation();

  const el = e.target;

  if(inspectMode==='input'){
    const val = prompt('Value:', el.value);
    if(val!==null) el.value = val;
  }

  if(inspectMode==='text'){
    const old = el.textContent;
    const val = prompt('Text:', old);
    if(val && val!==old){
      history.push({type:'text',el,old});
      el.textContent = val;
    }
  }

  if(inspectMode==='css'){
    const old = el.style.cssText;
    const val = prompt('CSS:', old);
    if(val!==null){
      history.push({type:'css',el,old});
      el.style.cssText = val;
    }
  }

  inspectMode=false;

},true);

// search replace (respects visible toggle)
box.querySelector('#sr').onclick=()=>{
  const f = prompt('Find:');
  if(!f) return;
  const r = prompt('Replace with:');

  document.querySelectorAll('*:not([data-devtool] *)').forEach(el=>{
    if(el.children.length===0 && isVisible(el)){
      if(el.textContent.includes(f)){
        history.push({type:'text',el,old:el.textContent});
        el.textContent = el.textContent.split(f).join(r);
      }
    }
  });
};

// undo
box.querySelector('#undo').onclick=()=>{
  const last = history.pop();
  if(!last) return;
  if(last.type==='text') last.el.textContent = last.old;
  if(last.type==='css') last.el.style.cssText = last.old;
};

// ===== LIVE HTML EDIT (NO RELOAD) =====
box.querySelector('#livehtml').onclick = ()=>{

  const panel = document.createElement('div');

  panel.style = `
    position:fixed;
    top:50px;
    left:50px;
    width:85%;
    height:80%;
    background:#000;
    color:#0f0;
    z-index:2147483647;
    padding:10px;
    border:2px solid #0f0;
  `;

  panel.innerHTML = `
    <b>LIVE HTML EDIT</b><br><br>

    <input id=find placeholder="Find..." style="width:40%">
    <input id=rep placeholder="Replace..." style="width:40%">
    <button id=doAll>Replace All</button>

    <br><br>

    <textarea id=htmlbox style="width:100%;height:65%;"></textarea><br>

    <button id=apply>Apply</button>
    <button id=close>Close</button>
  `;

  document.body.appendChild(panel);

  const boxEl = panel.querySelector('#htmlbox');
  boxEl.value = document.documentElement.outerHTML;

  panel.querySelector('#doAll').onclick = ()=>{
    const f = panel.querySelector('#find').value;
    const r = panel.querySelector('#rep').value;
    if(!f) return;
    boxEl.value = boxEl.value.split(f).join(r);
  };

  panel.querySelector('#apply').onclick = ()=>{
    const temp = document.createElement('html');
    temp.innerHTML = boxEl.value;

    const newBody = temp.querySelector('body');
    if(newBody){
      document.body.innerHTML = newBody.innerHTML;
    }
  };

  panel.querySelector('#close').onclick = ()=>panel.remove();
};

// close
box.querySelector('#x').onclick=()=>{
  box.remove();
  blocker?.remove();
  delete window.__DEVTOOL;
};

})();
