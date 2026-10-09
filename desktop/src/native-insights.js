(function(global) {
  'use strict';
  const invoke=(command,args)=>global.__TAURI__.core.invoke(command,args);
  class InsightsDataset {
    constructor(metadata) { this.metadata=metadata; this.baseId=metadata.tabularId; this.viewId=this.baseId; this.gridId=this.baseId; this.ids=new Set([this.baseId]);this.pending=new Set();this.closed=false; }
    track(work) {
      if(this.closed)return Promise.reject(Object.assign(new Error('Dataset is closed'),{name:'AbortError'}));
      const promise=work();this.pending.add(promise);promise.then(()=>this.pending.delete(promise),()=>this.pending.delete(promise));return promise;
    }
    async discard(ids) {for(const id of new Set(ids)){if(id===this.baseId||id===this.viewId||id===this.gridId)continue;await invoke('release_editor_dataset',{id});this.ids.delete(id);}}
    static async open(file) {
      const metadata=await invoke('open_editor_dataset',{id:file.tabularId,native:Boolean(global.TangentTabular.nativeMetadata(file.tabularId))});
      const instance=new InsightsDataset(metadata);
      try { instance.profile=await invoke('profile_insights',{id:instance.baseId}); return instance; }
      catch(error) {await instance.release();throw error;}
    }
    slice(query) {return this.track(async()=>{
      const previous=[this.viewId,this.gridId];
      const metadata=await invoke('filter_insights',{id:this.baseId,filter:{query}});
      this.ids.add(metadata.tabularId);
      try {const profile=await invoke('profile_insights',{id:metadata.tabularId});if(this.closed)throw Object.assign(new Error('Dataset is closed'),{name:'AbortError'});this.viewId=this.gridId=metadata.tabularId;this.profile=profile;await this.discard(previous);return profile;}
      catch(error){await invoke('release_editor_dataset',{id:metadata.tabularId});this.ids.delete(metadata.tabularId);throw error;}
    });}
    drill(filter) {return this.track(async()=>{
      const previous=this.gridId;
      if (!filter) {this.gridId=this.viewId;await this.discard([previous]);return;}
      const metadata=await invoke('filter_insights',{id:this.viewId,filter});this.ids.add(metadata.tabularId);this.gridId=metadata.tabularId;await this.discard([previous]);
    });}
    page(offset,limit) {return invoke('read_editor_page',{id:this.gridId,offset,limit});}
    async aggregate(chart) {
      const key=JSON.stringify([this.viewId,chart]);
      if(this.chartCache?.key!==key)this.chartCache={key,promise:invoke('aggregate_insights',{id:this.viewId,chart})};
      try {return structuredClone(await this.chartCache.promise);}
      catch(error){if(this.chartCache?.key===key)this.chartCache=null;throw error;}
    }
    async result() {return {nativeId:this.gridId,ext:'csv',label:'Current filtered dataset'};}
    async release() {this.closed=true;await Promise.allSettled([...this.pending]);await Promise.all([...this.ids].map(id=>invoke('release_editor_dataset',{id})));this.ids.clear();}
  }
  global.InsightsDataset=InsightsDataset;
})(window);
