(() => {
 const header=document.querySelector('.rt-masthead');
 if(!header)return;
 const menu=header.querySelector('.rt-menu'),nav=header.querySelector('.rt-nav');
 const close=()=>{menu.setAttribute('aria-expanded','false');nav.classList.remove('open');menu.querySelector('span').textContent='+';};
 menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);menu.querySelector('span').textContent=open?'−':'+';});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){close();menu.focus();}});
 document.addEventListener('click',event=>{if(!header.contains(event.target))close();});
 window.matchMedia('(min-width:761px)').addEventListener('change',event=>{if(event.matches)close();});
})();
