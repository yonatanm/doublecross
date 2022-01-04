const formatDate = (d)=>{
  return d.toLocaleString('HE-IL', {  day: '2-digit', year: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
 }

 export {formatDate}