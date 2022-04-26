from threading import Thread
import numpy as np
from stmpy import Driver, Machine
import paho.mqtt.client as mqtt
import cv2
import time
#from broker import MQTT_Client_1

#broker, port = "localhost", 1883
#broker, port = "mqtt.item.ntnu.no", 1883
broker, port = "test.mosquitto.org", 1883

class camSTM: #The class for the state machine with two functions called as trigger effects. 
    def __init__(self):
        print("init")
    def notify_in_frame(self): #Sends message to react app via mqtt
        myclient.client.publish("/ttm4115/team_12/cam", "cam2 in_frame")
    def notify_left_frame(self): #Sends message to react app via mqtt
        myclient.client.publish("/ttm4115/team_12/cam", "cam2 left_frame")

class MQTT_Client:
    def __init__(self):
        self.count = 0
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def on_connect(self, client, userdata, flags, rc): #Printing connect info on mqtt init
        print("on_connect(): {}".format(mqtt.connack_string(rc)))

    def on_message(self, client, userdata, msg): #Handles the different messages
        msg =  msg.payload.decode("utf-8")
        print(msg)
        
        if(msg == "cam2_in_frame"): #Checking the message received
            print("hello")
            self.stm_driver.send("cam2_in_frame","camMachine") #Trigger for going from searching to person_in_frame state
        if(msg == "cam2_left_frame"):
            self.stm_driver.send('cam2_left_frame','camMachine') #Trigger for going from person_in_frame to out_of_frame

    def start(self, broker, port):

        print("Connecting to {}:{}".format(broker, port))
        self.client.connect(broker, port)

        self.client.subscribe("/ttm4115/team_12/camInternal") #Subscribing to the internal broker for faceSearch

        try:
            thread = Thread(target=self.client.loop_forever)
            thread.start()
        except KeyboardInterrupt:
            print("Interrupted")
            self.client.disconnect()




t0 = {  #Initial state
    'source': 'initial', 
    'target': 'searching',
}

t1 = {  #Transition from cam2_in_frame to searching which should send a message through notify_in_frame()
    "trigger": 'cam2_in_frame',
    "source": 'searching',
    "target": "person_in_frame",
    "effect": "notify_in_frame"
}

t2 = { #When receiving left_frame this transition will start a timer of 20 seconds
    "trigger": "cam2_left_frame",
    "source": "person_in_frame",
    "target": "out_of_frame",
    "effect": 'start_timer("t",20000)',
}

t3 = { #If timer runs out this will trigger
    "trigger": "t",
    "source": "out_of_frame",
    "target": "searching",
    "effect": "notify_left_frame"
}
t4 = { #If receiving in_frame before timer runs out this will trigger
    "trigger": "in_frame;",
    "source": "out_of_frame",
    "target": "person_in_frame",
}

myclient = MQTT_Client()
myclient.start(broker, port)

cam = camSTM()
machine = Machine(name='camMachine', transitions=[t0, t1, t2, t3], obj=cam)
cam.stm = machine
driver = Driver()
driver.add_machine(machine)
myclient.stm_driver = driver
driver.start()