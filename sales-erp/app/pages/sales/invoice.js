import {useState,useEffect} from "react"
import axios from "axios"
import Sidebar from "../../components/Sidebar"
import { buildApiUrl } from "../../utils/api"

export default function Invoice(){

const [items,setItems] = useState([])
const [item,setItem] = useState("")
const [quantity,setQuantity] = useState("")
const [ledger,setLedger] = useState("")
const [billType,setBillType] = useState("")
const [dispatch,setDispatch] = useState("")
const [credit,setCredit] = useState("")
const [term,setTerm] = useState("")
const [stock,setStock] = useState(0)

useEffect(()=>{

axios.get(buildApiUrl("/api/items/"))
.then(res=>{
setItems(res.data)
})

},[])

const handleItemChange=(e)=>{

let selected = items.find(i=>i.id == e.target.value)

setItem(e.target.value)
setStock(selected.stock)

}

const submitInvoice = async ()=>{

if(!ledger || !billType || !quantity || !dispatch || !credit || !term){

alert("Please fill mandatory fields")
return

}

if(stock == 0){

alert("Stock Out Quantity 0")
return

}

try{

await axios.post(buildApiUrl("/api/create-invoice/"),{

item:item,
ledger:ledger,
bill_type:billType,
quantity:quantity,
dispatch_doc_no:dispatch,
credit_days:credit,
term_type:term

})

alert("Invoice Created")

}catch(err){

alert(err.response.data.error)

}

}

return(

<div style={{display:"flex"}}>

<Sidebar/>

<div style={{padding:"30px",width:"100%"}}>

<h2>Add Sales Invoice</h2>

<div>

<select onChange={handleItemChange}>
<option>Select Item</option>

{items.map(i=>(
<option key={i.id} value={i.id}>
{i.item_name}
</option>
))}

</select>

<input
placeholder="Ledger"
onChange={(e)=>setLedger(e.target.value)}
/>

<input
placeholder="Bill Type"
onChange={(e)=>setBillType(e.target.value)}
/>

<input
placeholder="Quantity"
type="number"
onChange={(e)=>setQuantity(e.target.value)}
/>

<input
placeholder="Dispatch Doc No"
onChange={(e)=>setDispatch(e.target.value)}
/>

<input
placeholder="Credit Days"
onChange={(e)=>setCredit(e.target.value)}
/>

<input
placeholder="Term Type"
onChange={(e)=>setTerm(e.target.value)}
/>

<button onClick={submitInvoice}>
ADD
</button>

</div>

</div>

</div>

)

}
