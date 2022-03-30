import { useState, useEffect } from "react";
import firebase from "firebase";
import { firestore } from "firebase/firestore";

export default function FirebaseTest() {
    const db = firebase.firestore();
    const collectionRef = db.collection("test");
    const [count, setCount] = useState(0);
    const [docRef, setDocRef] = useState(null);

    useEffect(() => {
        const documentReference = collectionRef.doc("TYdW8JIYu2eB5Xgi5R9N");
        setDocRef(documentReference);
        
        documentReference.get().then((value) => setCount(value.data().count));
    }, []);

    useEffect(() => {
        if (docRef) {
            docRef.set({ count });
        }
    }, [count]);

    function increment() {
        setCount(() => count + 1);
    }

    return (
        <div>
            <p>{count}</p>
            <button onClick={() => increment()}>Click</button>
        </div>
    )
}