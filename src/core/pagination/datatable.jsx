/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React,{useState} from "react";
import { Table } from "antd";
import { onShowSizeChange } from "./pagination";

const Datatable = ({ columns, dataSource, ...rest }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };
  return (
    <Table
      {...rest}
      rowSelection={rowSelection}
      columns={columns}
      dataSource={dataSource}
      size="small"
      rowKey={(record) => record.id || record.key}
    />
  );
};

export default Datatable;
