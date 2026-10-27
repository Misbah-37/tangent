const form=document.getElementById('directorySearch');
if(form){
  const catalog=JSON.parse(document.getElementById('catalog').textContent);
  const search=document.getElementById('query');
  const category=document.getElementById('category');
  const params=new URLSearchParams(location.search);
  search.value=params.get('q')||'';
  if(params.get('group')==='media')category.value='media';
  if(params.get('group')==='visual')category.value='visual';
  if([...category.options].some(o=>o.value===params.get('category')))category.value=params.get('category');
  const original=[...document.querySelectorAll('.tool-card')];
  const render=()=>{const q=search.value.trim().toLowerCase();let count=0;
    original.forEach((card,i)=>{const t=catalog[i];const text=`${t.title} ${t.keywords||''} ${t.category} ${t.sidebarDesc}`.toLowerCase();card.hidden=!((category.value==='all'||t.category===category.value||(category.value==='visual'&&['Images & Photos','Design & Dev Graphics'].includes(t.category))||(category.value==='media'&&['Images & Photos','Design & Dev Graphics','Audio & Video'].includes(t.category)))&&text.includes(q));if(!card.hidden)count++;});
    const analystPromo=document.getElementById('analyst-directory-promo');
    if(analystPromo)analystPromo.hidden=category.value!=='Data & Analytics';
    document.getElementById('count').textContent=`${count} ${count===1?'tool':'tools'}`;
    document.getElementById('empty').hidden=count>0;
  };
  search.addEventListener('input',render);category.addEventListener('change',render);
  form.addEventListener('submit',e=>{e.preventDefault();render();});render();
}
